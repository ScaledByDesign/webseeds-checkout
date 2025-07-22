# Level 3 Data Implementation for NMI Gateway

## Overview
Level 3 data provides detailed transaction information that can result in lower interchange rates and better reporting. It's especially important for B2B transactions and corporate purchasing cards.

## What We've Added

### Level 2 Data (Summary Information)
- **Tax Amount**: Calculated at 8.75% (configurable)
- **Shipping Amount**: Currently set to $0.00 (free shipping)
- **Purchase Order Number**: Same as Order ID
- **Customer Receipt**: Enabled

### Level 3 Data (Line Item Details)
For each product in the order, we now send:
- `item_product_code_X`: Product ID
- `item_description_X`: Product name
- `item_commodity_code_X`: 44121700 (Health/Beauty products)
- `item_unit_cost_X`: Unit price
- `item_quantity_X`: Quantity ordered
- `item_unit_of_measure_X`: EA (Each)
- `item_total_amount_X`: Line total
- `item_tax_amount_X`: Tax for this line item
- `item_tax_rate_X`: Tax rate percentage
- `item_discount_amount_X`: Discount (currently 0)
- `item_tax_type_X`: SALE
- `item_alternate_tax_id_X`: Alternative tax ID (if applicable)

### Additional Summary Fields
- **Discount**: Total order discount
- **Subtotal**: Pre-tax subtotal
- **Surcharge**: Additional fees
- **Duty Amount**: Import duties (for international)

## Example Transaction

For a Fitspresso 6-pack order ($294.00):

```
Subtotal: $294.00
Tax (8.75%): $25.73
Shipping: $0.00
Total: $319.73

Line Item:
- Product: fitspresso-6-pack
- Description: Fitspresso 6 Bottle Super Pack
- Quantity: 1
- Unit Price: $294.00
- Line Total: $294.00
- Item Tax: $25.73
```

## Benefits of Level 3 Data

1. **Lower Interchange Rates**: Can save 0.5-1% on B2B transactions
2. **Better Fraud Protection**: More data points for verification
3. **Enhanced Reporting**: Detailed transaction data in reports
4. **Corporate Card Compliance**: Required by many corporate cards
5. **Tax Reporting**: Easier reconciliation with tax breakdowns

## Response Enhancement

The API response now includes:

```json
{
  "success": true,
  "transactionId": "1234567890",
  "orderId": "WS-1234567890-ABC123",
  "amount": "319.73",
  "breakdown": {
    "subtotal": "294.00",
    "tax": "25.73",
    "shipping": "0.00",
    "total": "319.73"
  },
  "level3Data": {
    "itemCount": 1,
    "items": [{
      "id": "fitspresso-6-pack",
      "name": "Fitspresso 6 Bottle Super Pack",
      "quantity": 1,
      "unitPrice": "294.00",
      "total": "294.00"
    }]
  }
}
```

## Customization Options

You can enhance this further by:

1. **Dynamic Tax Calculation**: Based on shipping address
2. **Shipping Costs**: Calculate based on weight/location
3. **Discounts**: Apply coupon codes or volume discounts
4. **Multiple Tax Types**: State, local, GST, VAT
5. **SKU Mapping**: Map products to specific commodity codes
6. **Customer Type**: B2B vs B2C pricing

## Testing the Enhanced Flow

1. Make a test purchase at `/test-checkout`
2. Check the debug logs for Level 3 data
3. Verify in NMI dashboard that line items appear
4. Check if interchange rates are optimized

The Level 3 data implementation is now complete and will provide better transaction details and potentially lower processing costs!