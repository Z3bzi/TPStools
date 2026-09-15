/**
 * Navnelister skrives som fri tekst – komma er det vanlige, men semikolon og
 * linjeskift skal virke like godt. Tomme ledd og duplikater faller bort.
 */
export function tolkNavneliste(tekst: string): string[] {
  const navn = tekst
    .split(/[,;\n]/)
    .map((n) => n.trim())
    .filter((n) => n !== "");

  return [...new Set(navn)];
}

/** Navnelista slik den vises igjen i et tekstfelt. */
export function formaterNavneliste(navn: string[]): string {
  return navn.join(", ");
}
