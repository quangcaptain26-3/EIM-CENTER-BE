import { TrialLead, TrialSchedule } from "../../../domain/trials/entities/trial-lead.entity";

export class TrialsMapper {
  static toResponse(lead: TrialLead, schedule?: TrialSchedule | null) {
    return {
      id: lead.id,
      fullName: lead.fullName,
      phone: lead.phone,
      email: lead.email,
      source: lead.source,
      status: lead.status,
      note: lead.note,
      createdBy: lead.createdBy,
      createdAt: lead.createdAt.toISOString(),
      schedule: schedule ? {
        id: schedule.id,
        classId: schedule.classId,
        trialDate: schedule.trialDate.toISOString(),
      } : null
    };
  }

  static toListResponse(leads: TrialLead[]) {
    return leads.map((lead) => this.toResponse(lead, lead.schedule ?? null));
  }
}
