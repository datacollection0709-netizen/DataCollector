import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Attribute 3 Seeding ---');

  // 1. Organization
  const org = await prisma.organization.upsert({
    where: { code: 'AITS-001' },
    update: {},
    create: {
      name: 'Apex Institute of Technology & Science',
      code: 'AITS-001',
      contactEmail: 'accreditation@apex.edu',
    },
  });
  console.log(`Organization created/found: ${org.name} (${org.id})`);

  // 2. Users (Admin, Reviewer, Data Entry)
  const salt = await bcrypt.genSalt(10);
  const passwordAdmin = await bcrypt.hash('Admin@123', salt);
  const passwordReviewer = await bcrypt.hash('Reviewer@123', salt);
  const passwordEntry = await bcrypt.hash('Entry@123', salt);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@institution.edu' },
    update: {},
    create: {
      name: 'Dr. Ramesh Sharma (Admin)',
      email: 'admin@institution.edu',
      passwordHash: passwordAdmin,
      role: 'ADMIN',
      organizationId: org.id,
    },
  });

  const reviewer = await prisma.user.upsert({
    where: { email: 'reviewer@institution.edu' },
    update: {},
    create: {
      name: 'Prof. Sunita Patel (Reviewer)',
      email: 'reviewer@institution.edu',
      passwordHash: passwordReviewer,
      role: 'REVIEWER',
      organizationId: org.id,
    },
  });

  const entryUser = await prisma.user.upsert({
    where: { email: 'entry@institution.edu' },
    update: {},
    create: {
      name: 'Krishna Verma (Data Officer)',
      email: 'entry@institution.edu',
      passwordHash: passwordEntry,
      role: 'DATA_ENTRY',
      organizationId: org.id,
    },
  });

  console.log('Users seeded: admin, reviewer, entryUser');

  // 3. Years (2023-24, 2024-25, 2025-26)
  const yearsData = [
    { code: '2023-24', displayOrder: 1 },
    { code: '2024-25', displayOrder: 2 },
    { code: '2025-26', displayOrder: 3 },
  ];

  const years: Record<string, any> = {};
  for (const y of yearsData) {
    const yr = await prisma.year.upsert({
      where: { code: y.code },
      update: { displayOrder: y.displayOrder },
      create: y,
    });
    years[y.code] = yr;
  }
  console.log('Years seeded: 2023-24, 2024-25, 2025-26');

  // 4. Attribute 3
  const attribute = await prisma.attribute.upsert({
    where: { code: '3' },
    update: {},
    create: {
      code: '3',
      title: 'Attribute 3: Infrastructure and Learning Resources',
      description: 'Physical facilities, library expenditure, research software, IT infrastructure, and inclusive campus environment.',
      version: 1,
      active: true,
    },
  });

  // 5. Sections 3.1 to 3.5
  const sectionsData = [
    {
      code: '3.1',
      title: 'Physical Infrastructure & Facilities',
      description: 'Teaching classrooms, specialized laboratories, campus sports, and student amenities.',
      displayOrder: 1,
    },
    {
      code: '3.2',
      title: 'Library & Digital Learning Resources Expenditure',
      description: 'Annual expenditure on e-books, e-journals, digital databases, and overall institutional non-salary expenditure.',
      displayOrder: 2,
    },
    {
      code: '3.3',
      title: 'Research Facilities, Software & Consortia Subscriptions',
      description: 'Subscriptions to national/international research consortia, specialized software, and departmental research labs.',
      displayOrder: 3,
    },
    {
      code: '3.4',
      title: 'IT Infrastructure & Digital Campus',
      description: 'Campus internet bandwidth, student-to-computer ratio, device availability, and digital learning setups.',
      displayOrder: 4,
    },
    {
      code: '3.5',
      title: 'Barrier-Free Campus & Divyangjan (PwD) Accessibility',
      description: 'Ramps, lifts, accessible washrooms, assistive technologies (e.g. JAWS), and human assistance facilities.',
      displayOrder: 5,
    },
  ];

  const sections: Record<string, any> = {};
  for (const s of sectionsData) {
    const sec = await prisma.section.upsert({
      where: { code: s.code },
      update: {
        title: s.title,
        description: s.description,
        displayOrder: s.displayOrder,
      },
      create: {
        attributeId: attribute.id,
        code: s.code,
        title: s.title,
        description: s.description,
        displayOrder: s.displayOrder,
      },
    });
    sections[s.code] = sec;
  }

  // 6. Fields definition precisely mirroring Excel workbook
  const fieldsData = [
    // Section 3.1
    {
      sectionCode: '3.1',
      code: '3.1.1',
      label: 'Teaching Classrooms',
      description: 'Total number of fully operational teaching classrooms available for curriculum delivery.',
      fieldType: 'NUMBER',
      unit: 'Classrooms',
      required: true,
      proofRequired: true,
      remarksAllowed: true,
      displayOrder: 1,
      validationRules: JSON.stringify({ min: 0 }),
    },
    {
      sectionCode: '3.1.2',
      code: '3.1.2',
      label: 'Laboratories',
      description: 'Dedicated academic and practical experimental laboratories.',
      fieldType: 'NUMBER',
      unit: 'Laboratories',
      required: true,
      proofRequired: true,
      remarksAllowed: true,
      displayOrder: 2,
      validationRules: JSON.stringify({ min: 0 }),
    },
    {
      sectionCode: '3.1.3',
      code: '3.1.3',
      label: 'Hostel Facility',
      description: 'On-campus student accommodation units. Toggle Not-Applicable if non-residential.',
      fieldType: 'NUMBER',
      unit: 'Hostels',
      required: true,
      proofRequired: false,
      remarksAllowed: true,
      displayOrder: 3,
      validationRules: JSON.stringify({ min: 0, allowNA: true }),
    },
    {
      sectionCode: '3.1.4',
      code: '3.1.4',
      label: 'Canteen Facility',
      description: 'Hygiene-certified campus food and dining facilities.',
      fieldType: 'NUMBER',
      unit: 'Canteens',
      required: true,
      proofRequired: true,
      remarksAllowed: true,
      displayOrder: 4,
      validationRules: JSON.stringify({ min: 0 }),
    },
    {
      sectionCode: '3.1.5',
      code: '3.1.5',
      label: 'Sports Ground',
      description: 'Outdoor athletic grounds and multipurpose play fields.',
      fieldType: 'NUMBER',
      unit: 'Grounds',
      required: true,
      proofRequired: true,
      remarksAllowed: true,
      displayOrder: 5,
      validationRules: JSON.stringify({ min: 0 }),
    },
    {
      sectionCode: '3.1.6',
      code: '3.1.6',
      label: 'Separate Clean Washroom – Boys',
      description: 'Dedicated functional and sanitized washrooms for male students.',
      fieldType: 'NUMBER',
      unit: 'Units',
      required: true,
      proofRequired: false,
      remarksAllowed: true,
      displayOrder: 6,
      validationRules: JSON.stringify({ min: 0 }),
    },
    {
      sectionCode: '3.1.7',
      code: '3.1.7',
      label: 'Separate Clean Washroom – Girls',
      description: 'Dedicated functional and sanitized washrooms for female students.',
      fieldType: 'NUMBER',
      unit: 'Units',
      required: true,
      proofRequired: false,
      remarksAllowed: true,
      displayOrder: 7,
      validationRules: JSON.stringify({ min: 0 }),
    },
    {
      sectionCode: '3.1.8',
      code: '3.1.8',
      label: 'Portable Drinking Water Facility',
      description: 'RO/UV purified drinking water dispensing stations on campus.',
      fieldType: 'NUMBER',
      unit: 'Stations',
      required: true,
      proofRequired: false,
      remarksAllowed: true,
      displayOrder: 8,
      validationRules: JSON.stringify({ min: 0 }),
    },
    {
      sectionCode: '3.1.9',
      code: '3.1.9',
      label: 'Language Laboratory',
      description: 'Computer-aided language and communication laboratory setups.',
      fieldType: 'NUMBER',
      unit: 'Labs',
      required: true,
      proofRequired: false,
      remarksAllowed: true,
      displayOrder: 9,
      validationRules: JSON.stringify({ min: 0, allowNA: true }),
    },
    {
      sectionCode: '3.1.10',
      code: '3.1.10',
      label: 'Auditorium and Seminar Halls',
      description: 'Audio-visual equipped conference halls and institutional auditorium.',
      fieldType: 'NUMBER',
      unit: 'Halls',
      required: true,
      proofRequired: true,
      remarksAllowed: true,
      displayOrder: 10,
      validationRules: JSON.stringify({ min: 0 }),
    },
    {
      sectionCode: '3.1.11',
      code: '3.1.11',
      label: 'Gymnasium',
      description: 'Campus fitness center with physical training equipment.',
      fieldType: 'NUMBER',
      unit: 'Gyms',
      required: true,
      proofRequired: true,
      remarksAllowed: true,
      displayOrder: 11,
      validationRules: JSON.stringify({ min: 0 }),
    },
    {
      sectionCode: '3.1.12',
      code: '3.1.12',
      label: 'Health & Wellness Centre',
      description: 'First-aid, emergency medical room, and wellness counseling facility.',
      fieldType: 'NUMBER',
      unit: 'Centres',
      required: true,
      proofRequired: false,
      remarksAllowed: true,
      displayOrder: 12,
      validationRules: JSON.stringify({ min: 0 }),
    },
    {
      sectionCode: '3.1.13',
      code: '3.1.13',
      label: 'Guest House',
      description: 'Accommodations for visiting professors, experts, and examiners.',
      fieldType: 'NUMBER',
      unit: 'Units',
      required: true,
      proofRequired: false,
      remarksAllowed: true,
      displayOrder: 13,
      validationRules: JSON.stringify({ min: 0, allowNA: true }),
    },
    {
      sectionCode: '3.1.14',
      code: '3.1.14',
      label: 'Transportation Facilities',
      description: 'Institutional buses, vans, and transit shuttles.',
      fieldType: 'NUMBER',
      unit: 'Vehicles',
      required: true,
      proofRequired: false,
      remarksAllowed: true,
      displayOrder: 14,
      validationRules: JSON.stringify({ min: 0, allowNA: true }),
    },
    {
      sectionCode: '3.1.15',
      code: '3.1.15',
      label: 'Museum / Artifacts',
      description: 'Historical, botanical, geological, or heritage preservation collections.',
      fieldType: 'NUMBER',
      unit: 'Collections',
      required: true,
      proofRequired: false,
      remarksAllowed: true,
      displayOrder: 15,
      validationRules: JSON.stringify({ min: 0, allowNA: true }),
    },

    // Section 3.2
    {
      sectionCode: '3.2',
      code: '3.2.1a',
      label: 'Expenditure on e-books and digital resources',
      description: 'Direct annual financial expenditure on digital library books, journals, and databases (in INR ₹).',
      fieldType: 'CURRENCY',
      unit: 'INR (₹)',
      required: true,
      proofRequired: false,
      remarksAllowed: true,
      displayOrder: 1,
      validationRules: JSON.stringify({ min: 0 }),
    },
    {
      sectionCode: '3.2',
      code: '3.2.2',
      label: 'Total expenditure excluding salary',
      description: 'Total institutional annual recurring and capital expenditure, excluding staff salaries (in INR ₹).',
      fieldType: 'CURRENCY',
      unit: 'INR (₹)',
      required: true,
      proofRequired: false,
      remarksAllowed: true,
      displayOrder: 2,
      validationRules: JSON.stringify({ min: 0 }),
    },
    {
      sectionCode: '3.2',
      code: '3.2.1',
      label: 'Percentage expenditure on e-books and digital resources',
      description: 'Calculated as: (Expenditure on digital resources / Total expenditure excluding salary) * 100.',
      fieldType: 'PERCENTAGE',
      unit: '%',
      required: true,
      proofRequired: false,
      remarksAllowed: true,
      displayOrder: 3,
      validationRules: JSON.stringify({ formula: 'percentage_of_total', numeratorField: '3.2.1a', denominatorField: '3.2.2' }),
    },

    // Section 3.3
    {
      sectionCode: '3.3',
      code: '3.3.1',
      label: 'E-Journals Consortia subscription',
      description: 'Active membership to national consortia (e.g. N-LIST, DELNET, IEEE, ScienceDirect).',
      fieldType: 'TEXT',
      unit: 'Consortia Name',
      required: true,
      proofRequired: true,
      remarksAllowed: true,
      displayOrder: 1,
      validationRules: JSON.stringify({ suggestedValues: ['N-LIST', 'DELNET', 'INFLIBNET', 'None'] }),
    },
    {
      sectionCode: '3.3.2',
      code: '3.3.2',
      label: 'Subscription to e-Shodh Sindhu',
      description: 'Higher education research resources consortium subscription status.',
      fieldType: 'TEXT',
      unit: 'Status / Membership',
      required: true,
      proofRequired: false,
      remarksAllowed: true,
      displayOrder: 2,
      validationRules: JSON.stringify({ suggestedValues: ['N-LIST', 'Active', 'None', '-----'] }),
    },
    {
      sectionCode: '3.3.3',
      code: '3.3.3',
      label: 'Plagiarism Checking Software',
      description: 'Licensed academic similarity & integrity software (e.g., Turnitin, DrillBit, Urkund).',
      fieldType: 'TEXT',
      unit: 'Software Name',
      required: true,
      proofRequired: false,
      remarksAllowed: true,
      displayOrder: 3,
      validationRules: JSON.stringify({ suggestedValues: ['Turnitin', 'DrillBit', 'Ouriginal/Urkund', '-----'] }),
    },
    {
      sectionCode: '3.3.4',
      code: '3.3.4',
      label: 'Licensed Statistical Software',
      description: 'Statistical analysis software packages (e.g. SPSS, SAS, Stata, R-Studio Pro).',
      fieldType: 'TEXT',
      unit: 'Software Name',
      required: false,
      proofRequired: false,
      remarksAllowed: true,
      displayOrder: 4,
      validationRules: JSON.stringify({}),
    },
    {
      sectionCode: '3.3.5',
      code: '3.3.5',
      label: 'Discipline-Specific Software',
      description: 'Engineering, architectural, bioinformatics or design software (e.g., MATLAB, AutoCAD, ChemDraw).',
      fieldType: 'TEXT',
      unit: 'Packages',
      required: false,
      proofRequired: false,
      remarksAllowed: true,
      displayOrder: 5,
      validationRules: JSON.stringify({}),
    },
    {
      sectionCode: '3.3.6',
      code: '3.3.6',
      label: 'Discipline-Specific Research Laboratories',
      description: 'Specialized high-end departmental research and incubation spaces.',
      fieldType: 'TEXT',
      unit: 'Facilities',
      required: false,
      proofRequired: false,
      remarksAllowed: true,
      displayOrder: 6,
      validationRules: JSON.stringify({}),
    },
    {
      sectionCode: '3.3.7',
      code: '3.3.7',
      label: 'Other Relevant Research Resources',
      description: 'Repositories, specialized databases, patent archives, or instrumentation facilities.',
      fieldType: 'TEXT',
      unit: 'Resources',
      required: false,
      proofRequired: false,
      remarksAllowed: true,
      displayOrder: 7,
      validationRules: JSON.stringify({}),
    },

    // Section 3.4
    {
      sectionCode: '3.4',
      code: '3.4.1',
      label: 'Internet Bandwidth in MBPS',
      description: 'Dedicated leased line internet bandwidth available across the institution.',
      fieldType: 'NUMBER',
      unit: 'MBPS',
      required: true,
      proofRequired: false,
      remarksAllowed: true,
      displayOrder: 1,
      validationRules: JSON.stringify({ min: 1 }),
    },
    {
      sectionCode: '3.4.2',
      code: '3.4.2',
      label: 'Student-to-Computer Ratio',
      description: 'Calculated ratio based on total enrolled students to total functional student computers (e.g. 1:16 with 4,127 students).',
      fieldType: 'RATIO',
      unit: 'Ratio (Students : Computers)',
      required: true,
      proofRequired: false,
      remarksAllowed: true,
      displayOrder: 2,
      validationRules: JSON.stringify({ formula: 'ratio', relatedComputerField: '3.4.3' }),
    },
    {
      sectionCode: '3.4.3',
      code: '3.4.3',
      label: 'Number of Laptops / Desktop available for students',
      description: 'Total working desktop computers and laptops exclusively allocated for student academic use.',
      fieldType: 'NUMBER',
      unit: 'Computers',
      required: true,
      proofRequired: false,
      remarksAllowed: true,
      displayOrder: 3,
      validationRules: JSON.stringify({ min: 0 }),
    },
    {
      sectionCode: '3.4',
      code: '3.4.4',
      label: 'Advanced Digital Facilities',
      description: 'State-of-the-art immersive technologies such as Virtual Classrooms & Laboratories, AR/VR setups.',
      fieldType: 'MULTI_SELECT',
      unit: 'Facilities',
      required: false,
      proofRequired: false,
      remarksAllowed: true,
      displayOrder: 4,
      validationRules: JSON.stringify({
        options: [
          'Virtual Classrooms and Laboratories',
          'Augmented Reality (AR) & Virtual Reality (VR)',
          'AI/Robotics Lab',
          'Media Center / Recording Studio',
        ],
      }),
    },

    // Section 3.5
    {
      sectionCode: '3.5',
      code: '3.5.1',
      label: 'Built environment with Ramps / Lifts',
      description: 'Architectural barrier-free access with step-free entrance ramps, handrails, and passenger elevators.',
      fieldType: 'BOOLEAN',
      unit: 'Yes/No',
      required: true,
      proofRequired: false,
      remarksAllowed: true,
      displayOrder: 1,
      validationRules: JSON.stringify({}),
    },
    {
      sectionCode: '3.5.2',
      code: '3.5.2',
      label: 'Divyangjan-friendly washrooms',
      description: 'Dedicated accessible toilets with grab-bars, wide doors, and wheelchair turning space.',
      fieldType: 'NUMBER',
      unit: 'Washrooms',
      required: true,
      proofRequired: false,
      remarksAllowed: true,
      displayOrder: 2,
      validationRules: JSON.stringify({ min: 0 }),
    },
    {
      sectionCode: '3.5.3',
      code: '3.5.3',
      label: 'Tactile Paths / Appropriate Lighting and Display Boards / Signposts',
      description: 'Guiding tactile ground surface indicators (TGSI), LED directional signage, and high-contrast signage.',
      fieldType: 'BOOLEAN',
      unit: 'Yes/No',
      required: true,
      proofRequired: false,
      remarksAllowed: true,
      displayOrder: 3,
      validationRules: JSON.stringify({}),
    },
    {
      sectionCode: '3.5.4',
      code: '3.5.4',
      label: 'Assistive technology and facilities for Persons with Disabilities',
      description: 'Accessible websites, screen-reading software (e.g. JAWS, NVDA), mechanized braille/speech equipment.',
      fieldType: 'TEXT',
      unit: 'Assistive Tools',
      required: true,
      proofRequired: true,
      remarksAllowed: true,
      displayOrder: 4,
      validationRules: JSON.stringify({ suggestedValues: ['JAWS', 'NVDA', 'Braille Embosser', 'None'] }),
    },
    {
      sectionCode: '3.5.5',
      code: '3.5.5',
      label: 'Provision of enquiry and Information: Human Assistant and Softcopies of reading materials',
      description: 'Designated helpdesk assistants, accessible digital audio/e-texts, and scribes for examinations.',
      fieldType: 'BOOLEAN',
      unit: 'Yes/No',
      required: true,
      proofRequired: false,
      remarksAllowed: true,
      displayOrder: 5,
      validationRules: JSON.stringify({}),
    },
  ];

  const fields: Record<string, any> = {};
  for (const f of fieldsData) {
    const secCode = f.code.split('.').slice(0, 2).join('.');
    const sec = sections[secCode] || sections[f.sectionCode];
    if (!sec) {
      throw new Error(`Section not found for field ${f.code} (secCode: ${secCode})`);
    }
    const field = await prisma.field.upsert({
      where: { code: f.code },
      update: {
        label: f.label,
        description: f.description,
        fieldType: f.fieldType,
        unit: f.unit,
        required: f.required,
        proofRequired: f.proofRequired,
        remarksAllowed: f.remarksAllowed,
        validationRules: f.validationRules,
        displayOrder: f.displayOrder,
      },
      create: {
        sectionId: sec.id,
        code: f.code,
        label: f.label,
        description: f.description,
        fieldType: f.fieldType,
        unit: f.unit,
        required: f.required,
        proofRequired: f.proofRequired,
        remarksAllowed: f.remarksAllowed,
        validationRules: f.validationRules,
        displayOrder: f.displayOrder,
      },
    });
    fields[f.code] = field;
  }
  console.log(`Fields seeded: ${fieldsData.length} fields configured.`);

  // 7. Initial Baseline Submission from Excel Workbook
  // Upsert submission for Apex Institute
  let submission = await prisma.submission.findFirst({
    where: {
      organizationId: org.id,
      attributeId: attribute.id,
    },
  });

  if (!submission) {
    submission = await prisma.submission.create({
      data: {
        organizationId: org.id,
        attributeId: attribute.id,
        status: 'DRAFT',
        createdBy: entryUser.id,
      },
    });
  }

  // Seed sample values from Excel
  const sampleExcelValues = [
    // 3.1
    { code: '3.1.1', y: '2023-24', num: 59, text: null, na: false, remarks: null },
    { code: '3.1.1', y: '2024-25', num: 61, text: null, na: false, remarks: null },
    { code: '3.1.1', y: '2025-26', num: 81, text: null, na: false, remarks: null },

    { code: '3.1.2', y: '2023-24', num: 35, text: null, na: false, remarks: null },
    { code: '3.1.2', y: '2024-25', num: 35, text: null, na: false, remarks: null },
    { code: '3.1.2', y: '2025-26', num: 44, text: null, na: false, remarks: null },

    { code: '3.1.3', y: '2023-24', num: null, text: '-----', na: true, remarks: 'Non-residential institution' },
    { code: '3.1.3', y: '2024-25', num: null, text: '-----', na: true, remarks: 'Non-residential institution' },
    { code: '3.1.3', y: '2025-26', num: null, text: '-----', na: true, remarks: 'Non-residential institution' },

    { code: '3.1.4', y: '2023-24', num: 1, text: null, na: false, remarks: null },
    { code: '3.1.4', y: '2024-25', num: 1, text: null, na: false, remarks: null },
    { code: '3.1.4', y: '2025-26', num: 1, text: null, na: false, remarks: null },

    { code: '3.1.5', y: '2023-24', num: 1, text: null, na: false, remarks: null },
    { code: '3.1.5', y: '2024-25', num: 1, text: null, na: false, remarks: null },
    { code: '3.1.5', y: '2025-26', num: 1, text: null, na: false, remarks: null },

    { code: '3.1.6', y: '2023-24', num: 20, text: null, na: false, remarks: null },
    { code: '3.1.6', y: '2024-25', num: 20, text: null, na: false, remarks: null },
    { code: '3.1.6', y: '2025-26', num: 30, text: null, na: false, remarks: null },

    { code: '3.1.7', y: '2023-24', num: 24, text: null, na: false, remarks: null },
    { code: '3.1.7', y: '2024-25', num: 24, text: null, na: false, remarks: null },
    { code: '3.1.7', y: '2025-26', num: 34, text: null, na: false, remarks: null },

    { code: '3.1.8', y: '2023-24', num: 16, text: null, na: false, remarks: null },
    { code: '3.1.8', y: '2024-25', num: 17, text: null, na: false, remarks: null },
    { code: '3.1.8', y: '2025-26', num: 18, text: null, na: false, remarks: null },

    { code: '3.1.9', y: '2023-24', num: null, text: '-----', na: true, remarks: 'Combined with multimedia hall' },
    { code: '3.1.9', y: '2024-25', num: null, text: '-----', na: true, remarks: 'Combined with multimedia hall' },
    { code: '3.1.9', y: '2025-26', num: null, text: '-----', na: true, remarks: 'Combined with multimedia hall' },

    { code: '3.1.10', y: '2023-24', num: 1, text: null, na: false, remarks: null },
    { code: '3.1.10', y: '2024-25', num: 1, text: null, na: false, remarks: null },
    { code: '3.1.10', y: '2025-26', num: 1, text: null, na: false, remarks: null },

    { code: '3.1.11', y: '2023-24', num: 1, text: null, na: false, remarks: null },
    { code: '3.1.11', y: '2024-25', num: 1, text: null, na: false, remarks: null },
    { code: '3.1.11', y: '2025-26', num: 1, text: null, na: false, remarks: null },

    { code: '3.1.12', y: '2023-24', num: 1, text: null, na: false, remarks: null },
    { code: '3.1.12', y: '2024-25', num: 1, text: null, na: false, remarks: null },
    { code: '3.1.12', y: '2025-26', num: 1, text: null, na: false, remarks: null },

    { code: '3.1.13', y: '2023-24', num: null, text: '-----', na: true, remarks: null },
    { code: '3.1.13', y: '2024-25', num: null, text: '-----', na: true, remarks: null },
    { code: '3.1.13', y: '2025-26', num: null, text: '-----', na: true, remarks: null },

    { code: '3.1.14', y: '2023-24', num: null, text: '-----', na: true, remarks: null },
    { code: '3.1.14', y: '2024-25', num: null, text: '-----', na: true, remarks: null },
    { code: '3.1.14', y: '2025-26', num: null, text: '-----', na: true, remarks: null },

    { code: '3.1.15', y: '2023-24', num: null, text: '-----', na: true, remarks: null },
    { code: '3.1.15', y: '2024-25', num: null, text: '-----', na: true, remarks: null },
    { code: '3.1.15', y: '2025-26', num: null, text: '-----', na: true, remarks: null },

    // 3.2
    { code: '3.2.1a', y: '2023-24', num: 182000, text: null, na: false, remarks: null },
    { code: '3.2.1a', y: '2024-25', num: 391000, text: null, na: false, remarks: null },
    { code: '3.2.1a', y: '2025-26', num: 427000, text: null, na: false, remarks: null },

    { code: '3.2.2', y: '2023-24', num: 44004796, text: null, na: false, remarks: null },
    { code: '3.2.2', y: '2024-25', num: 35251137, text: null, na: false, remarks: null },
    { code: '3.2.2', y: '2025-26', num: 35741783, text: null, na: false, remarks: null },

    { code: '3.2.1', y: '2023-24', num: 0.41, text: null, na: false, remarks: '0.0041 as decimal fraction' },
    { code: '3.2.1', y: '2024-25', num: 1.10, text: null, na: false, remarks: '0.0110 as decimal fraction' },
    { code: '3.2.1', y: '2025-26', num: 1.19, text: null, na: false, remarks: '0.0119 as decimal fraction' },

    // 3.3
    { code: '3.3.1', y: '2023-24', num: null, text: 'N-LIST', na: false, remarks: null },
    { code: '3.3.1', y: '2024-25', num: null, text: 'N-LIST', na: false, remarks: null },
    { code: '3.3.1', y: '2025-26', num: null, text: 'DELNET', na: false, remarks: 'DELNET Application and MoU active' },

    { code: '3.3.2', y: '2023-24', num: null, text: 'N-LIST', na: false, remarks: null },
    { code: '3.3.2', y: '2024-25', num: null, text: 'N-LIST', na: false, remarks: null },
    { code: '3.3.2', y: '2025-26', num: null, text: '-----', na: true, remarks: null },

    { code: '3.3.3', y: '2023-24', num: null, text: '-----', na: true, remarks: null },
    { code: '3.3.3', y: '2024-25', num: null, text: '-----', na: true, remarks: null },
    { code: '3.3.3', y: '2025-26', num: null, text: '-----', na: true, remarks: null },

    // 3.4
    { code: '3.4.1', y: '2023-24', num: 310, text: '310 MBPS', na: false, remarks: null },
    { code: '3.4.1', y: '2024-25', num: 310, text: '310 MBPS', na: false, remarks: null },
    { code: '3.4.1', y: '2025-26', num: 310, text: '310 MBPS', na: false, remarks: null },

    { code: '3.4.3', y: '2023-24', num: 258, text: null, na: false, remarks: null },
    { code: '3.4.3', y: '2024-25', num: 258, text: null, na: false, remarks: null },
    { code: '3.4.3', y: '2025-26', num: 318, text: null, na: false, remarks: null },

    { code: '3.4.2', y: '2023-24', num: 16, text: '1: 16 (4127)', na: false, ratioNum: 4127, ratioDenom: 258, remarks: 'Enrolled: 4127' },
    { code: '3.4.2', y: '2024-25', num: 17, text: '1: 17 (4526)', na: false, ratioNum: 4526, ratioDenom: 258, remarks: 'Enrolled: 4526' },
    { code: '3.4.2', y: '2025-26', num: 15, text: '1:15 (4731)', na: false, ratioNum: 4731, ratioDenom: 318, remarks: 'Enrolled: 4731' },

    { code: '3.4.4', y: '2025-26', num: null, text: 'Virtual Classrooms and Laboratories, Augmented Reality (AR) & Virtual Reality (VR)', na: false, remarks: 'AR/VR innovation hub established' },

    // 3.5
    { code: '3.5.1', y: '2023-24', num: null, text: 'Yes', na: false, remarks: 'Ramps with handrails' },
    { code: '3.5.1', y: '2024-25', num: null, text: 'Yes', na: false, remarks: 'Ramps with handrails' },
    { code: '3.5.1', y: '2025-26', num: null, text: 'Yes', na: false, remarks: 'Ramps with handrails and elevator access' },

    { code: '3.5.2', y: '2023-24', num: 2, text: null, na: false, remarks: null },
    { code: '3.5.2', y: '2024-25', num: 2, text: null, na: false, remarks: null },
    { code: '3.5.2', y: '2025-26', num: 2, text: null, na: false, remarks: null },

    { code: '3.5.3', y: '2023-24', num: null, text: 'Yes', na: false, remarks: 'Tactile paths installed' },
    { code: '3.5.3', y: '2024-25', num: null, text: 'Yes', na: false, remarks: 'Tactile paths installed' },
    { code: '3.5.3', y: '2025-26', num: null, text: 'Yes', na: false, remarks: 'Tactile paths installed' },

    { code: '3.5.4', y: '2023-24', num: null, text: 'JAWS', na: false, remarks: 'Screen reading software' },
    { code: '3.5.4', y: '2024-25', num: null, text: 'JAWS', na: false, remarks: 'Screen reading software' },
    { code: '3.5.4', y: '2025-26', num: null, text: 'JAWS', na: false, remarks: 'JAWS Purchase Order documented' },

    { code: '3.5.5', y: '2023-24', num: null, text: 'Yes', na: false, remarks: 'Designated student assistants' },
    { code: '3.5.5', y: '2024-25', num: null, text: 'Yes', na: false, remarks: 'Designated student assistants' },
    { code: '3.5.5', y: '2025-26', num: null, text: 'Yes', na: false, remarks: 'Softcopies and scribes available' },
  ];

  for (const item of sampleExcelValues) {
    const f = fields[item.code];
    const y = years[item.y];
    if (!f || !y) continue;

    await prisma.submissionValue.upsert({
      where: {
        submissionId_fieldId_yearId: {
          submissionId: submission.id,
          fieldId: f.id,
          yearId: y.id,
        },
      },
      update: {
        isNotApplicable: item.na,
        numericValue: item.num,
        textValue: item.text,
        ratioNumerator: (item as any).ratioNum ?? null,
        ratioDenominator: (item as any).ratioDenom ?? null,
        remarks: item.remarks,
      },
      create: {
        submissionId: submission.id,
        fieldId: f.id,
        yearId: y.id,
        isNotApplicable: item.na,
        numericValue: item.num,
        textValue: item.text,
        ratioNumerator: (item as any).ratioNum ?? null,
        ratioDenominator: (item as any).ratioDenom ?? null,
        remarks: item.remarks,
      },
    });
  }

  // 8. Seed sample Document records matching Excel proofs
  const sampleDocs = [
    {
      fieldCode: '3.1.1',
      yearCode: '2025-26',
      fileName: 'List of Classrooms.pdf',
      mimeType: 'application/pdf',
      fileSize: 245760,
    },
    {
      fieldCode: '3.1.2',
      yearCode: '2025-26',
      fileName: 'List of Laboratories.pdf',
      mimeType: 'application/pdf',
      fileSize: 184320,
    },
    {
      fieldCode: '3.1.4',
      yearCode: '2025-26',
      fileName: 'Canteen.JPG',
      mimeType: 'image/jpeg',
      fileSize: 512000,
    },
    {
      fieldCode: '3.1.5',
      yearCode: '2025-26',
      fileName: '4.1.2 Main Play Ground.jpeg',
      mimeType: 'image/jpeg',
      fileSize: 680000,
    },
    {
      fieldCode: '3.1.10',
      yearCode: '2025-26',
      fileName: '4.1.2  Seminar Hall.jpeg',
      mimeType: 'image/jpeg',
      fileSize: 720000,
    },
    {
      fieldCode: '3.1.11',
      yearCode: '2025-26',
      fileName: '4.1.2  Gymnasium.jpeg',
      mimeType: 'image/jpeg',
      fileSize: 640000,
    },
    {
      fieldCode: '3.3.1',
      yearCode: '2025-26',
      fileName: 'DELNET Application and MoU 25-06-2026 Final.pdf',
      mimeType: 'application/pdf',
      fileSize: 921600,
    },
    {
      fieldCode: '3.5.4',
      yearCode: '2025-26',
      fileName: 'JAWS Purchase Order.pdf',
      mimeType: 'application/pdf',
      fileSize: 350000,
    },
  ];

  for (const doc of sampleDocs) {
    const f = fields[doc.fieldCode];
    const y = years[doc.yearCode];
    if (!f || !y) continue;

    const existingDoc = await prisma.document.findFirst({
      where: {
        submissionId: submission.id,
        fieldId: f.id,
        originalFileName: doc.fileName,
      },
    });

    if (!existingDoc) {
      await prisma.document.create({
        data: {
          submissionId: submission.id,
          fieldId: f.id,
          yearId: y.id,
          originalFileName: doc.fileName,
          storagePath: `uploads/${org.id}/${submission.id}/${doc.fileName}`,
          mimeType: doc.mimeType,
          fileSize: doc.fileSize,
          uploadedBy: entryUser.id,
        },
      });
    }
  }

  // 9. Initial Audit Log
  await prisma.auditLog.create({
    data: {
      organizationId: org.id,
      userId: entryUser.id,
      action: 'SYSTEM_SEED',
      entityType: 'SUBMISSION',
      entityId: submission.id,
      newValue: 'Initial baseline submission seeded from Data Collection Sheet for Attribute 3.xlsx',
    },
  });

  console.log('--- Attribute 3 Seeding Completed Successfully ---');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
