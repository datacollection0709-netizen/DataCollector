import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '../prisma';

describe('Attribute 3 Backend REST APIs', () => {
  let entryToken: string;
  let reviewerToken: string;
  let submissionId: string;

  beforeAll(async () => {
    await prisma.submission.updateMany({
      data: { status: 'DRAFT' },
    });
  });

  it('GET /health should return 200 and healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Healthy');
    expect(res.body.database).toBe('Connected');
  });

  it('POST /api/auth/login with valid data entry credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'entry@institution.edu',
      password: 'Entry@123',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('DATA_ENTRY');
    entryToken = res.body.token;
  });

  it('POST /api/auth/login with valid reviewer credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'reviewer@institution.edu',
      password: 'Reviewer@123',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('REVIEWER');
    reviewerToken = res.body.token;
  });

  it('POST /api/auth/login with incorrect password should be rejected with 401', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'entry@institution.edu',
      password: 'WrongPassword!',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/attributes/3 should return complete Attribute 3 structure with 5 sections', async () => {
    const res = await request(app)
      .get('/api/attributes/3')
      .set('Authorization', `Bearer ${entryToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.attribute.code).toBe('3');
    expect(res.body.attribute.sections.length).toBe(5);
    expect(res.body.years.length).toBe(3);
  });

  it('GET /api/submissions/current should return current active submission with progress', async () => {
    const res = await request(app)
      .get('/api/submissions/current')
      .set('Authorization', `Bearer ${entryToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.submission).toBeDefined();
    expect(res.body.progress).toBeDefined();
    submissionId = res.body.submission.id;
  });

  it('POST /api/submissions/:id/draft should save modified values and update progress', async () => {
    const res = await request(app)
      .post(`/api/submissions/${submissionId}/draft`)
      .set('Authorization', `Bearer ${entryToken}`)
      .send({
        values: [
          {
            fieldCode: '3.1.1',
            yearCode: '2025-26',
            numericValue: 82, // Changed from 81 to 82
            isNotApplicable: false,
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.savedAt).toBeDefined();
  });

  it('GET /api/audit should return audit logs for Reviewer/Admin', async () => {
    const res = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${reviewerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.logs)).toBe(true);
    expect(res.body.logs.length).toBeGreaterThan(0);
  });
});
