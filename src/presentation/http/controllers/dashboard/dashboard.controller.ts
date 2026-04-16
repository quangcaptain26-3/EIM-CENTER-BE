import type { Request, Response } from 'express';
import type { DashboardStatsUseCase } from '../../../../application/dashboard/usecases/dashboard-stats.usecase';

export function createDashboardController(usecase: DashboardStatsUseCase) {
  return {
    stats: async (req: Request, res: Response) => {
      const userId = req.user!.id;
      const role = req.user!.role;
      const data = await usecase.execute(userId, role);
      res.status(200).json({ data });
    },
  };
}
