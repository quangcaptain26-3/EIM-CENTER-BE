import type { ProgramRepoPort } from "../../../domain/curriculum/repositories/program.repo.port";
import type { UnitRepoPort } from "../../../domain/curriculum/repositories/unit.repo.port";

import type { CurriculumScope } from "../dtos/curriculum-import-export.dto";

export class ExportCurriculumUseCase {
  constructor(
    private readonly programRepo: ProgramRepoPort,
    private readonly unitRepo: UnitRepoPort,
  ) {}

  async execute(params: {
    scope: CurriculumScope;
    programCodes?: string[];
  }): Promise<any> {
    const { scope, programCodes } = params;

    const programs = await this.programRepo.listPrograms();
    const filteredPrograms = programCodes?.length
      ? programs.filter((p) => programCodes.includes(p.code))
      : programs;

    const resultPrograms = await Promise.all(
      filteredPrograms.map(async (p) => {
        const base = {
          code: p.code,
          name: p.name,
          level: p.level,
          totalUnits: p.totalUnits,
          lessonsPerUnit: p.lessonsPerUnit,
          sessionsPerWeek: p.sessionsPerWeek,
          feePlanId: p.feePlanId ?? null,
        };

        if (scope === "program") return base;

        const units = await this.unitRepo.listUnitsByProgram(p.id);
        const unitsPayload = await Promise.all(
          units.map(async (u) => {
            const unitBase = {
              unitNo: u.unitNo,
              title: u.title,
              totalLessons: u.totalLessons,
            };

            if (scope === "unit") return unitBase;

            const lessons = await this.unitRepo.listLessons(u.id);
            return {
              ...unitBase,
              lessons: lessons.map((l) => ({
                lessonNo: l.lessonNo,
                title: l.title,
                sessionPattern: l.sessionPattern,
              })),
            };
          }),
        );

        return {
          ...base,
          units: unitsPayload,
        };
      }),
    );

    return {
      version: 1,
      scope,
      exportedAt: new Date().toISOString(),
      programs: resultPrograms,
    };
  }
}

