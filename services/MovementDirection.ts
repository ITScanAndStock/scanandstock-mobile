import { StatsModel } from "@/model/Stats";

type Movement = Pick<StatsModel, "type" | "quantity">;

type MovementDirection = { increase: boolean; label: string };

const INCREASE_TYPES = ["increase", "in", "entrée"];
const DECREASE_TYPES = ["decrease", "out", "sortie"];

function isIncrease({ type, quantity }: Movement): boolean {
  if (INCREASE_TYPES.includes(type)) {
    return true;
  }
  if (DECREASE_TYPES.includes(type)) {
    return false;
  }
  return quantity >= 0;
}

export function movementDirection(movement: Movement): MovementDirection {
  const increase = isIncrease(movement);
  const absoluteQuantity = Math.abs(movement.quantity);
  return { increase, label: `${increase ? "+" : "−"}${absoluteQuantity}` };
}
