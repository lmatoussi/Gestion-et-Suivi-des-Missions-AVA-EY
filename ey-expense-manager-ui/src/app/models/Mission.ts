// src/app/models/mission.model.ts
export interface Mission {
  id: number;
  idMission: string;
  nomDeContract: string;
  client: string;
  dateSignature: Date;
  engagementCode: string;
  pays: string;
  montantDevise: number;
  montantTnd: number;
  ava: number;
  associerId: number | null;
  status: string;
  createdBy: string;
  createdDate: Date;
}

// src/app/models/mission.model.ts
// src/models/Mission.ts
export interface MissionCreate {
  idMission: string;
  nomDeContract: string;
  client: string;
  dateSignature: string;
  engagementCode?: string;
  pays?: string;
  selectedCurrency?: string; // Add this field
  montantDevise: number;
  montantTnd: number;
  ava: number;
  associerId?: number | null;
  status: string;
  createdBy: string;
  
}


export interface MissionUpdate {
  id: number;
  idMission?: string;
  nomDeContract?: string;
  client?: string;
  dateSignature?: string; // Change from Date to string
  engagementCode?: string;
  pays?: string;
  montantDevise?: number;
  montantTnd?: number;
  ava?: number;
  associerId?: number | null;
  status?: string;
  updatedBy?: string; // Add updatedBy here if the backend expects it
}
