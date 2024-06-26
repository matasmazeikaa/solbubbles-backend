import { TOKEN_CONFIG } from "@/constants";
import { toNumberSafe } from "./game-util";

export const getTokensFromLamports = (lamports: number) => {
    return lamports / TOKEN_CONFIG.LAMPORTS_PER_TOKEN;
  };
  
  export const roundTokensFromLamports = (lamports: string) => {
    const lamportsNumber = toNumberSafe(lamports);

    return roundTo(getTokensFromLamports(lamportsNumber), 2);
  };
  
  function round(method: 'round' | 'ceil' | 'floor', number: number, precision: number) {
    if (typeof number !== "number") {
      throw new TypeError("Expected value to be a number");
    }
  
    if (precision === Number.POSITIVE_INFINITY) {
      return number;
    }
  
    if (!Number.isInteger(precision)) {
      throw new TypeError("Expected precision to be an integer");
    }
  
    const isRoundingAndNegative = method === "round" && number < 0;
    if (isRoundingAndNegative) {
      number = Math.abs(number);
    }
  
    const power = 10 ** precision;
  
    // @ts-ignore
    let result = Math[method]((number * power).toPrecision(15)) / power;
  
    if (isRoundingAndNegative) {
    }
  
    return result;
  }
  
  export const roundTo = round.bind(undefined, "round");
  export const roundToUp = round.bind(undefined, "ceil");
  export const roundToDown = round.bind(undefined, "floor");