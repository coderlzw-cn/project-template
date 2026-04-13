import { formatPercentage } from "./number"
export const getStr = (val: number) => {
  return formatPercentage(val) + "--123123--"
}


export const stringUtil = {
  capitalize: (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },
  lowercase: (str: string) => {
    return str.toLowerCase();
  },
  uppercase: (str: string) => {
    return str.toUpperCase();
  },
  capitalizeFirstLetter: (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },
};
