export function numberToWords(num: number): string {
  if (num === 0) return "Zero";

  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertGroup(n: number): string {
    if (n === 0) return "";
    else if (n < 20) return ones[n] + " ";
    else if (n < 100) return tens[Math.floor(n / 10)] + " " + convertGroup(n % 10);
    else return ones[Math.floor(n / 100)] + " Hundred " + convertGroup(n % 100);
  }

  let words = "";

  if (Math.floor(num / 10000000) > 0) {
    words += convertGroup(Math.floor(num / 10000000)) + "Crore ";
    num %= 10000000;
  }

  if (Math.floor(num / 100000) > 0) {
    words += convertGroup(Math.floor(num / 100000)) + "Lakh ";
    num %= 100000;
  }

  if (Math.floor(num / 1000) > 0) {
    words += convertGroup(Math.floor(num / 1000)) + "Thousand ";
    num %= 1000;
  }

  if (num > 0) {
    words += convertGroup(num);
  }

  return words.trim();
}
