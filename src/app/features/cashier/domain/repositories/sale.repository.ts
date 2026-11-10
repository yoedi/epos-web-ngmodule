import { Sale, SaleRequest } from '../models/sale';

/**
 * Saves sales. Bound to an implementation in CashierModule.
 * Promise-based because domain/ may not depend on rxjs.
 */
export abstract class SaleRepository {
  /** Rejects with the server error (AppError) when the sale is refused. */
  abstract create(request: SaleRequest): Promise<Sale>;
}
