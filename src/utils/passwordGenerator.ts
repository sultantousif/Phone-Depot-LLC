// Password generator adhering to:
// - Word with at least one capital letter and minimum 4 letters (e.g. "Metro", "Portal", "Secure", "World", "Alpha")
// - 4 random digits (e.g. "8492")
// - 1 special character (e.g. "!", "@", "#", "$", "*")

const WORD_BANK = [
  'Metro', 'World', 'Portal', 'Secure', 'Direct', 
  'Global', 'Prime', 'Apex', 'Titan', 'Vanguard', 
  'Access', 'Shield', 'Nexus', 'Vertex', 'Matrix',
  'Summit', 'Pulse', 'Anchor', 'Falcon', 'Beacon'
];

const SPECIAL_CHARS = ['!', '@', '#', '$', '%', '&', '*'];

export function generateCompliantTempPassword(prefixWord?: string): string {
  const word = prefixWord 
    ? (prefixWord.charAt(0).toUpperCase() + prefixWord.slice(1).toLowerCase())
    : WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)];
  
  // Ensure the word is at least 4 letters
  const safeWord = word.length >= 4 ? word : `${word}Safe`;
  
  // 4 random digits (1000 - 9999)
  const fourDigits = Math.floor(1000 + Math.random() * 9000).toString();
  
  // 1 special character
  const specialChar = SPECIAL_CHARS[Math.floor(Math.random() * SPECIAL_CHARS.length)];
  
  return `${safeWord}${fourDigits}${specialChar}`;
}

export function isValidCompliantPassword(pwd: string): boolean {
  if (!pwd || pwd.length < 8) return false;
  // Has at least one uppercase letter
  const hasUpper = /[A-Z]/.test(pwd);
  // Has at least 4 letters total
  const letterCount = (pwd.match(/[a-zA-Z]/g) || []).length;
  // Has at least 4 digits
  const digitCount = (pwd.match(/\d/g) || []).length;
  // Has at least one special char
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd);

  return hasUpper && letterCount >= 4 && digitCount >= 4 && hasSpecial;
}
