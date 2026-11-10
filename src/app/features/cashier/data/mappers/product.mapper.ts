import { Product } from '../../domain/models/product';
import { CashierProductDto } from '../dto/product.dto';

export function toProduct(dto: CashierProductDto): Product {
  return {
    id: dto.id,
    sku: dto.sku,
    barcode: dto.barcode,
    name: dto.name,
    categoryName: dto.category.name,
    unit: dto.unit,
    sellPrice: dto.sell_price,
    stock: dto.stock,
    minStock: dto.min_stock,
    isActive: dto.is_active,
  };
}
