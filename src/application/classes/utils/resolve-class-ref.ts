import { IClassRepo } from '../../../domain/classes/repositories/class.repo.port';
import { AppError } from '../../../shared/errors/app-error';
import { ERROR_CODES } from '../../../shared/errors/error-codes';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** UUID lớp hoặc mã hiển thị EIM-LS-01 → classes.id */
export async function resolveClassRefToId(
  classRepo: IClassRepo,
  ref: string,
): Promise<string> {
  const trimmed = ref.trim();
  if (!trimmed) {
    throw new AppError(ERROR_CODES.VALIDATION_ERROR, 'Chọn lớp mới', 422);
  }

  if (UUID_RE.test(trimmed)) {
    const byId = await classRepo.findById(trimmed);
    if (!byId) {
      throw new AppError(ERROR_CODES.CLASS_NOT_FOUND, 'Không tìm thấy lớp mới', 404);
    }
    return byId.id;
  }

  const byCode = await classRepo.findByCode(trimmed);
  if (!byCode) {
    throw new AppError(
      ERROR_CODES.CLASS_NOT_FOUND,
      `Không tìm thấy lớp "${trimmed}"`,
      404,
    );
  }
  return byCode.id;
}
