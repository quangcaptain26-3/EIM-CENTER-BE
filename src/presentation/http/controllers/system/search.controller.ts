import { Request, Response, NextFunction } from 'express';
import { GlobalSearchUseCase } from '../../../../application/system/usecases/global-search.usecase';
import { SearchStudentsUseCase } from '../../../../application/system/usecases/search-students.usecase';
import { SearchUsersUseCase } from '../../../../application/system/usecases/search-users.usecase';
import { SearchClassesUseCase } from '../../../../application/system/usecases/search-classes.usecase';

export function createSearchController(
  globalSearchUseCase: GlobalSearchUseCase,
  searchStudentsUseCase: SearchStudentsUseCase,
  searchUsersUseCase: SearchUsersUseCase,
  searchClassesUseCase: SearchClassesUseCase,
) {
  return {
    globalSearch: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await globalSearchUseCase.execute({
          q: req.query.q as string,
          limit: 15,
        });
        res.json(result);
      } catch (err) {
        next(err);
      }
    },
    searchStudents: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
        const result = await searchStudentsUseCase.execute({
          q: req.query.q as string,
          limit,
        });
        res.json(result);
      } catch (err) {
        next(err);
      }
    },
    searchUsers: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
        const result = await searchUsersUseCase.execute({
          q: req.query.q as string,
          limit,
          roleCode: req.query.role as string | undefined, // Mapping query 'role' to 'roleCode'
        });
        res.json(result);
      } catch (err) {
        next(err);
      }
    },
    searchClasses: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
        const result = await searchClassesUseCase.execute({
          q: req.query.q as string,
          limit,
        });
        res.json(result);
      } catch (err) {
        next(err);
      }
    },
  };
}
