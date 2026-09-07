import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '../prisma';
import path from 'path';
import fs from 'fs';

describe('Complete Attribute 3 End-to-End Institutional Workflow', () => {
  let officerToken: string;
  let reviewerToken: string;
  let submissionId: string;

  beforeAll(async () => {
    await prisma.submission.updateMany({
      data: { status: 'DRAFT' },
    });
  });

  it('Step 1: Data Officer logs in', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'entry@institution.edu',
      password: 'Entry@123',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.name).toBe('Krishna Verma (Data Officer)');
    officerToken = res.body.token;
  });

  it('Step 2: Retrieve Attribute 3 form definition and current submission', async () => {
    const attrRes = await request(app)
      .get('/api/attributes/3')
      .set('Authorization', `Bearer ${officerToken}`);

    expect(attrRes.status).toBe(200);
    expect(attrRes.body.attribute.sections.length).toBe(5);

    const subRes = await request(app)
      .get('/api/submissions/current')
      .set('Authorization', `Bearer ${officerToken}`);

    expect(subRes.status).toBe(200);
    expect(subRes.body.submission.id).toBeDefined();
    submissionId = subRes.body.submission.id;
  });

  it('Step 3: Save draft with edited values (3.1.1 classrooms updated to 85)', async () => {
    const saveRes = await request(app)
      .post(`/api/submissions/${submissionId}/draft`)
      .set('Authorization', `Bearer ${officerToken}`)
      .send({
        values: [
          {
            fieldCode: '3.1.1',
            yearCode: '2025-26',
            numericValue: 85,
            isNotApplicable: false,
            remarks: 'Expanded 4 additional digital classrooms in block C',
          },
          {
            fieldCode: '3.1.3',
            yearCode: '2025-26',
            isNotApplicable: true,
            textValue: '-----',
            remarks: 'Day college, non-residential campus',
          },
        ],
      });

    expect(saveRes.status).toBe(200);
    expect(saveRes.body.success).toBe(true);
    expect(saveRes.body.savedAt).toBeDefined();
  });

  it('Step 4: Reload submission and confirm values persisted (No Data Loss)', async () => {
    const res = await request(app)
      .get(`/api/submissions/${submissionId}`)
      .set('Authorization', `Bearer ${officerToken}`);

    expect(res.status).toBe(200);
    const cVal = res.body.submission.values.find(
      (v: any) => v.field.code === '3.1.1' && v.year.code === '2025-26'
    );
    expect(cVal).toBeDefined();
    expect(cVal.numericValue).toBe(85);
    expect(cVal.remarks).toContain('Expanded 4 additional');
  });

  it('Step 5: Upload supporting document proof', async () => {
    // Create temporary mock PDF
    const tempFile = path.join(__dirname, 'temp_test_classroom_proof.pdf');
    fs.writeFileSync(tempFile, '%PDF-1.4 Mock Classroom List Official Accreditation Evidence');

    const res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${officerToken}`)
      .field('submissionId', submissionId)
      .field('fieldCode', '3.1.1')
      .field('yearCode', '2025-26')
      .attach('file', tempFile);

    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.document.originalFileName).toBe('temp_test_classroom_proof.pdf');
  });

  it('Step 6: Submit form for Review', async () => {
    const res = await request(app)
      .post(`/api/submissions/${submissionId}/submit`)
      .set('Authorization', `Bearer ${officerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.submission.status).toBe('SUBMITTED');
  });

  it('Step 7: Committee Reviewer logs in and requests corrections (rejection with reason)', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'reviewer@institution.edu',
      password: 'Reviewer@123',
    });

    reviewerToken = loginRes.body.token;

    const rejectRes = await request(app)
      .post(`/api/submissions/${submissionId}/review`)
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({
        action: 'REJECT',
        reason: 'Please provide certified signature on the laboratory statement in section 3.1.2.',
      });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.submission.status).toBe('REJECTED');
    expect(rejectRes.body.submission.rejectionReason).toContain('laboratory statement');
  });

  it('Step 8: Officer corrects and re-submits', async () => {
    const res = await request(app)
      .post(`/api/submissions/${submissionId}/submit`)
      .set('Authorization', `Bearer ${officerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.submission.status).toBe('SUBMITTED');
  });

  it('Step 9: Reviewer approves submission', async () => {
    const res = await request(app)
      .post(`/api/submissions/${submissionId}/review`)
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({
        action: 'APPROVE',
      });

    expect(res.status).toBe(200);
    expect(res.body.submission.status).toBe('APPROVED');
  });

  it('Step 10: Export to Excel and verify file binary signature', async () => {
    const res = await request(app)
      .get(`/api/submissions/${submissionId}/export`)
      .set('Authorization', `Bearer ${reviewerToken}`)
      .buffer(true)
      .parse((res, cb) => {
        res.setEncoding('binary');
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => cb(null, Buffer.from(data, 'binary')));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
    expect(res.body.length).toBeGreaterThan(5000); // Binary xlsx file

    // Check PK zip signature for XLSX: 0x50 0x4B
    expect(res.body[0]).toBe(0x50);
    expect(res.body[1]).toBe(0x4b);
  });
});
