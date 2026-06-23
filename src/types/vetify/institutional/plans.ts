export type Plan = {
  name: string;
  price: number;
  features: string[];
};

export interface PlanItem {
  id: number;
  name: string;
  price: number;
  family: string;
  familyCode: string;
  discountType: string | null;
  priceWithDiscount: number;
  discountCategory: string | null;
}

export type PlanList = PlanItem[];

