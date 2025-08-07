import { Payment } from "./Payment";
import { PaymentType } from "./PaymentType";

export class PaymentFactory {
  static createPerServicePayment(
    userId: string,
    centreId: string,
    sessionId: string,
    amount: number,
    createdBy: string
  ): Payment {
    return new Payment({
      userId,
      centreId,
      paymentType: PaymentType.PerService,
      sessionIds: [sessionId],
      amount,
      createdBy,
      createdAt: new Date()
    });
  }

  static createBonusPayment(
    userId: string,
    centreId: string,
    amount: number,
    notes: string,
    createdBy: string
  ): Payment {
    return new Payment({
      userId,
      centreId,
      paymentType: PaymentType.Bonus,
      amount,
      notes,
      createdBy,
      createdAt: new Date()
    });
  }
}
