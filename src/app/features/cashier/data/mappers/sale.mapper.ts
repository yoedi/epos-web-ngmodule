import { Sale, SaleRequest } from '../../domain/models/sale';
import { CreateSaleRequestDto, SaleResponseDto } from '../dto/sale.dto';

export function toCreateSaleDto(request: SaleRequest): CreateSaleRequestDto {
  return {
    items: request.items.map((item) => ({ product_id: item.productId, qty: item.qty })),
    payment_method: request.paymentMethod,
    paid: request.paid,
  };
}

export function toSale(dto: SaleResponseDto): Sale {
  return {
    id: dto.id,
    invoiceNo: dto.invoice_no,
    cashierName: dto.cashier.name,
    items: dto.items.map((item) => ({
      productId: item.product_id,
      productName: item.product_name,
      unit: item.unit,
      price: item.price,
      qty: item.qty,
      subtotal: item.subtotal,
    })),
    subtotal: dto.subtotal,
    discount: dto.discount,
    total: dto.total,
    paymentMethod: dto.payment_method,
    paid: dto.paid,
    change: dto.change_amount,
    createdAt: new Date(dto.created_at),
  };
}
