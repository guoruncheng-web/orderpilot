import { nextStatus, orderTotal, shortage } from './workflow';

describe('order workflow',()=>{
  it('moves only through the documented states',()=>{
    expect(nextStatus('draft')).toBe('approval');
    expect(nextStatus('received')).toBe('shipped');
    expect(nextStatus('paid')).toBeNull();
    expect(nextStatus('invented')).toBeNull();
  });
  it('does not purchase stock already available after reservations',()=>{
    expect(shortage(20,3,12)).toBe(0);
    expect(shortage(4,0,12)).toBe(8);
    expect(shortage(4,8,2)).toBe(2);
  });
  it('recalculates a discounted total across every order line',()=>{
    expect(orderTotal([{unitPrice:128,quantity:2},{unitPrice:'76',quantity:3}],20)).toBeCloseTo(387.2);
  });
});
