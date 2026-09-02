export const workflow = ['draft','approval','approved','purchasing','received','shipped','paid'] as const;
export type OrderStatus = typeof workflow[number];

export function nextStatus(current:string):OrderStatus|null{
  const index=workflow.indexOf(current as OrderStatus);
  return index<0||index===workflow.length-1?null:workflow[index+1];
}

export function shortage(onHand:number,reserved:number,required:number){
  return Math.max(0,required-Math.max(0,onHand-reserved));
}

export function orderTotal(
  items: ReadonlyArray<{ unitPrice: number | string | { toString(): string }; quantity: number }>,
  discountPct: number,
){
  const subtotal=items.reduce((sum,item)=>sum+Number(item.unitPrice)*item.quantity,0);
  return subtotal*(1-discountPct/100);
}
