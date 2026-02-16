/**
 * HubSpot API types
 */

export type HubSpotContact = {
  id: string;
  properties: {
    phone?: string;
    email?: string;
    firstname?: string;
    lastname?: string;
    company?: string;
    hs_lead_status?: string; // "NEW", "CONNECTED", "ATTEMPTED_TO_CONTACT", etc.
    [key: string]: string | undefined;
  };
};

export type HubSpotContactResponse = {
  results: HubSpotContact[];
  paging?: {
    next?: {
      after: string;
    };
  };
};

export type HubSpotTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
};

export type HubSpotAccountInfo = {
  portalId: number;
  user?: string;
  [key: string]: unknown;
};

export type HubSpotDeal = {
  id: string;
  properties: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
    pipeline?: string;
    closedate?: string;
    dealtype?: string;
    [key: string]: string | undefined;
  };
};

export type HubSpotDealProperties = {
  dealname: string;
  amount?: string;
  dealstage: string;
  pipeline: string;
  closedate?: string;
  dealtype?: string;
  description?: string;
  [key: string]: string | undefined;
};

export type HubSpotDealResponse = {
  id: string;
  properties: HubSpotDealProperties;
};

export type HubSpotPipeline = {
  id: string;
  label: string;
  displayOrder: number;
  stages: HubSpotDealStage[];
};

export type HubSpotDealStage = {
  id: string;
  label: string;
  displayOrder: number;
  probability?: string;
};

export type HubSpotPipelinesResponse = {
  results: HubSpotPipeline[];
};

/** Contact list (segment) from HubSpot Lists API */
export type HubSpotList = {
  listId: string;
  name: string;
  objectTypeId?: string;
  processingType?: string;
};

export type HubSpotListsSearchResponse = {
  results: HubSpotList[];
  paging?: {
    next?: { after: string };
  };
};

/** List membership: recordId is the contact ID */
export type HubSpotListMembership = {
  recordId: string;
};

export type HubSpotListMembershipsResponse = {
  results: HubSpotListMembership[];
  paging?: {
    next?: { after: string };
  };
};
