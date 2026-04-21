import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/*==============================================================================
  DATA SCHEMA DEFINITION
  This file defines your "Headers" (Attributes) and table structure.
  Amplify will automatically create a DynamoDB table for this model.
==============================================================================*/

const schema = a.schema({
  TestRobotek: a.model({
    name: a.string(),
    email: a.string(),
    number: a.string(),
    status: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),

  User: a.model({
    id: a.string().required(), // Employee Code
    username: a.string().required(),
    email: a.string().required(),
    password: a.string(),
    phone: a.string(),
    role_name: a.string(),
    late_long: a.string(), // Location JSON string
    image_url: a.string(),
    dob: a.string(),
    office: a.string(),
    designation: a.string(),
    department: a.string(),
    last_active: a.string(),
    permissions: a.string().array(),
  }).authorization(allow => [allow.publicApiKey()]),

  Dropdown: a.model({
    type: a.string().required(), // 'department' or 'designation'
    value: a.string().required(),
  }).authorization(allow => [allow.publicApiKey()]),

  // ── EA-MD HUB TABLES ──────────────────────────────────────────────────────

  EaMdWeeklyUpdate: a.model({
    weekOf: a.string(),
    preparedBy: a.string(),
    periodCovered: a.string(),
    category: a.string(),
    description: a.string(),
    date: a.string(),
    teamMember: a.string(),
    timestamp: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),

  EaMdUrgentLog: a.model({
    issueSummary: a.string(),
    urgencyLevel: a.string(),
    channelUsed: a.string(),
    requiredFromMD: a.string(),
    deadline: a.string(),
    status: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),

  EaMdActionLog: a.model({
    task: a.string(),
    owner: a.string(),
    priority: a.string(),
    status: a.string(),
    due: a.string(),
    notes: a.string(),
    timestamp: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),

  EaMdSyncMeeting: a.model({
    date: a.string(),
    time: a.string(),
    location: a.string(),
    agenda: a.string(),      // JSON string array
    decisions: a.string(),
    actionItems: a.string(), // JSON string array
    notes: a.string(),
    timestamp: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),

  EaMdTeamQuery: a.model({
    teamMember: a.string(),
    query: a.string(),
    category: a.string(),
    eaResolve: a.string(),
    status: a.string(),
    eaNotes: a.string(),
    timestamp: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),

  // ── DELEGATION TABLES ─────────────────────────────────────────────────────

  Delegation: a.model({
    id: a.string().required(), // Override auto-gen with string ID to match numbers
    title: a.string(),
    description: a.string(),
    assigned_by: a.string(),
    assigned_to: a.string(),
    department: a.string(),
    priority: a.string(),
    due_date: a.string(),
    status: a.string(),
    voice_note_url: a.string(),
    reference_docs: a.string(),
    evidence_required: a.string(),
    created_at: a.string(),
    updated_at: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),

  DelegationRevision: a.model({
    delegation_id: a.string(),
    old_status: a.string(),
    new_status: a.string(),
    old_due_date: a.string(),
    new_due_date: a.string(),
    reason: a.string(),
    created_at: a.string(),
    evidence_urls: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),

  DelegationRemark: a.model({
    delegation_id: a.string(),
    user_id: a.string(),
    username: a.string(),
    remark: a.string(),
    created_at: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),

  // ── HELP TICKET TABLES ───────────────────────────────────────────────────

  HelpTicket: a.model({
    id: a.string().required(), // Using numerical/string IDs to match legacy
    title: a.string(),
    description: a.string(),
    category: a.string(),
    priority: a.string(),
    raised_by: a.string(),
    solver_person: a.string(),
    planned_resolution: a.string(),
    status: a.string(),
    attachment_url: a.string(),
    voice_note: a.string(),
    created_at: a.string(),
    updated_at: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),

  HelpTicketHistory: a.model({
    ticket_id: a.string().required(),
    action_type: a.string(), // 'STATUS_CHANGE' | 'COMMENT'
    actor_username: a.string(),
    old_status: a.string(),
    new_status: a.string(),
    comment_text: a.string(),
    attachment_url: a.string(),
    voice_note: a.string(),
    created_at: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),

  // ── O2D MODULE ────────────────────────────────────────────────────────────
  // FORCE REFRESH: Schema sync trigger
  O2DRecord: a.model({
    id: a.string().required(),
    order_no: a.string(),
    party_name: a.string(),
    item_name: a.string(),
    item_qty: a.string(),
    est_amount: a.string(),
    item_specification: a.string(),
    remark: a.string(),
    order_screenshot: a.string(),
    filled_by: a.string(),
    created_at: a.string(),
    updated_at: a.string(),
    hold: a.string(),
    cancelled: a.string(),
    // Steps 1-11 (Corrected to 'actual_X')
    planned_1: a.string(), actual_1: a.string(), status_1: a.string(),
    planned_2: a.string(), actual_2: a.string(), status_2: a.string(),
    planned_3: a.string(), actual_3: a.string(), status_3: a.string(),
    planned_4: a.string(), actual_4: a.string(), status_4: a.string(),
    planned_5: a.string(), actual_5: a.string(), status_5: a.string(),
    planned_6: a.string(), actual_6: a.string(), status_6: a.string(),
    planned_7: a.string(), actual_7: a.string(), status_7: a.string(),
    planned_8: a.string(), actual_8: a.string(), status_8: a.string(),
    planned_9: a.string(), actual_9: a.string(), status_9: a.string(),
    planned_10: a.string(), actual_10: a.string(), status_10: a.string(),
    planned_11: a.string(), actual_11: a.string(), status_11: a.string(),
    // Step specific extras
    final_amount_1: a.string(), so_number_1: a.string(), merge_order_with_1: a.string(), upload_so_1: a.string(),
    num_of_parcel_5: a.string(), upload_pi_5: a.string(), actual_date_of_order_packed_5: a.string(),
    voucher_num_7: a.string(),
    order_details_checked_8: a.string(), voucher_num_51_8: a.string(), t_amt_8: a.string(),
    attach_bilty_9: a.string(), num_of_parcel_9: a.string(),
    sheet_created_at: a.string(), sheet_updated_at: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),

  // ── I2R MODULE ────────────────────────────────────────────────────────────
  I2RRecord: a.model({
    id: a.string().required(),
    indend_num: a.string(),
    item_name: a.string(),
    quantity: a.string(),
    category: a.string(),
    filled_by: a.string(),
    created_at: a.string(),
    updated_at: a.string(),
    cancelled: a.string(),
    // Steps 1-9
    planned_1: a.string(), actual_1: a.string(), status_1: a.string(),
    planned_2: a.string(), actual_2: a.string(), status_2: a.string(),
    planned_3: a.string(), actual_3: a.string(), status_3: a.string(),
    planned_4: a.string(), actual_4: a.string(), status_4: a.string(),
    planned_5: a.string(), actual_5: a.string(), status_5: a.string(),
    planned_6: a.string(), actual_6: a.string(), status_6: a.string(),
    planned_7: a.string(), actual_7: a.string(), status_7: a.string(),
    planned_8: a.string(), actual_8: a.string(), status_8: a.string(),
    planned_9: a.string(), actual_9: a.string(), status_9: a.string(),
    sheet_created_at: a.string(), sheet_updated_at: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),

  // ── IMS & PARTY ───────────────────────────────────────────────────────────
  IMSItem: a.model({
    id: a.string().required(),
    Item_name: a.string(),
    est_amount_item: a.string(),
    gst: a.string(),
    final_amount: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),

  Party: a.model({
    id: a.string().required(),
    customerType: a.string(),
    partyName: a.string(),
    dateOfBirth: a.string(),
    partyType: a.string(),
    salesFunnelUniqueNum: a.string(),
    salePersonName: a.string(),
    firstOrderItems: a.string(),
    detailsAndInstructions: a.string(),
    remarks: a.string(),
    filledBy: a.string(),
    timestamp: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),

  // ── ATTENDANCE & LEAVE ────────────────────────────────────────────────────
  AttendanceRecord: a.model({
    id: a.string().required(),
    userId: a.string(),
    userName: a.string(),
    date: a.string(), // YYYY-MM-DD
    inTime: a.string(),
    outTime: a.string(),
    status: a.string(),
    inPhoto: a.string(),
    outPhoto: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),

  LeaveRequest: a.model({
    id: a.string().required(),
    userId: a.string(),
    userName: a.string(),
    startDate: a.string(),
    endDate: a.string(),
    reason: a.string(),
    status: a.string(),
    responsibility1: a.string(),
    responsibility2: a.string(),
    responsibility3: a.string(),
    acceptedBy: a.string(),
    updatedAt: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),

  LeaveRemark: a.model({
    id: a.string().required(),
    leaveId: a.string(),
    userName: a.string(),
    comment: a.string(),
    createdAt: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),

  // ── CHAT MODULE ───────────────────────────────────────────────────────────
  ChatMessage: a.model({
    id: a.string().required(),
    sender_id: a.string(),
    receiver_id: a.string(),
    text: a.string(),
    type: a.string(), // "text" | "image" | "file" | "audio"
    media_url: a.string(),
    read_by: a.string(), // Comma separated usernames
    created_at: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),

  ChatGroup: a.model({
    id: a.string().required(),
    name: a.string(),
    participants: a.string(), // Comma separated usernames
    admins: a.string(), // Comma separated usernames
    created_by: a.string(),
    created_at: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),

  // ── SCOT MODULE ───────────────────────────────────────────────────────────
  ScotRecord: a.model({
    id: a.string().required(), // UniqueId
    employeeName: a.string(),
    employeeNumber: a.string(),
    toName: a.string(),
    countryCode: a.string(),
    toNumber: a.string(),
    callType: a.string(),
    duration: a.string(),
    callDate: a.string(),
    callTime: a.string(),
    notes: a.string(),
    audioUrl: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),

  CallRecord: a.model({
    id: a.string().required(), // partyName
    concernPerson: a.string(),
    mobileNum: a.string(),
    firmName: a.string(),
    district: a.string(),
    state: a.string(),
    region: a.string(),
    creditDaysNew: a.string(),
    limit: a.string(),
    collectionRating: a.string(),
    customerType: a.string(),
    salesPerson: a.string(),
    salesCoordinator: a.string(),
    averageOrderSize: a.string(),
    targetAvgOrderSize: a.string(),
    usuallyNoOfOrderMonthly: a.string(),
    frequencyOfCallingAfterOrderPlaced: a.string(),
    specialRemarkJSON: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),

  FollowUpRecord: a.model({
    id: a.string().required(),
    partyName: a.string(),
    status: a.string(),
    nextFollowUpDate: a.string(),
    remarks: a.string(),
    createdBy: a.string(),
    createdAt: a.string(),
    lastFollowUpDate: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),

  // ── SCHEDULER MODULE ──────────────────────────────────────────────────────
  Meeting: a.model({
    id: a.string().required(),
    date: a.string(),
    time: a.string(),
    location: a.string(),
    agenda: a.string(),
    decisions: a.string(),
    actionItems: a.string(),
    notes: a.string(),
    timestamp: a.string(),
  }).authorization(allow => [allow.publicApiKey()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
