export interface ExtractedData {
  fileName?: string;
  fileSize?: string;
  accountHolder?: string;
  accountNumber?: string;
  address?: string;
  statementDate?: string;
  paymentDueDate?: string;
  newBalance?: string;
  minimumPayment?: string;
  previousBalance?: string;
  pastDue?: string;
  purchases?: string;
  cashAdvances?: string;
  balanceTransfers?: string;
  feesCharged?: string;
  paymentsCredits?: string;
  interestCharged?: string;
  creditLimit?: string;
  availableCredit?: string;
  cashLimit?: string;
  availableCash?: string;
  purchaseAPR?: string;
  cashAPR?: string;
  purchasePeriodicRate?: string;
  cashPeriodicRate?: string;
  statementPeriod?: string;
  closingDate?: string;
  issuer?: string;
}

interface PatternSet {
  [key: string]: RegExp;
}

const patterns: { [issuer: string]: PatternSet } = {
  chase: {
    accountHolder: /(?:Account\s+Holder|Name\s+on\s+Account)[:\s]+([A-Z][A-Za-z\s,\.]+?)(?:\n|Account)/i,
    accountNumber: /Account\s+Number[:\s]*[\*\-]*(\d{4,})/i,
    statementDate: /Statement\s+(?:Date|Closing\s+Date)[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    paymentDueDate: /Payment\s+Due\s+Date[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    newBalance: /New\s+Balance[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
    minimumPayment: /Minimum\s+Payment[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
    previousBalance: /Previous\s+Balance[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
    purchases: /Purchases[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
    creditLimit: /Credit\s+Limit[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
    availableCredit: /Available\s+Credit[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
  },
  amex: {
    accountHolder: /(?:Member\s+Name|Account\s+Holder)[:\s]+([A-Z][A-Za-z\s,\.]+?)(?:\n|Account)/i,
    accountNumber: /Account\s+Ending\s+in[:\s]*(\d{4,})/i,
    statementDate: /(?:Statement|Closing)\s+Date[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    paymentDueDate: /Payment\s+Due[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    newBalance: /(?:New|Total)\s+Balance[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
    minimumPayment: /Minimum\s+Payment[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
    previousBalance: /Previous\s+Balance[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
    purchases: /Purchases[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
  },
  citi: {
    accountHolder: /(?:Name|Account\s+Holder)[:\s]+([A-Z][A-Za-z\s,\.]+?)(?:\n|Account)/i,
    accountNumber: /Account[:\s]*[\*\-]*(\d{4,})/i,
    statementDate: /Statement\s+(?:Closing|Date)[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    paymentDueDate: /Payment\s+Due\s+Date[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    newBalance: /New\s+Balance[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
    minimumPayment: /Minimum\s+Payment[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
    creditLimit: /Credit\s+Limit[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
  },
  bofa: {
    accountHolder: /Account\s+Holder[:\s]+([A-Z][A-Za-z\s,\.]+?)(?:\n|Account)/i,
    accountNumber: /Account\s+Number[:\s]*\d+-(\d{4})/i,
    statementDate: /Statement\s+Period[:\s]+\d{1,2}\/\d{1,2}\/\d{2,4}\s*-\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    paymentDueDate: /Payment\s+Due\s+Date[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    newBalance: /New\s+Balance[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
    minimumPayment: /Minimum\s+Payment[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
  },
  capitalOne: {
    accountHolder: /(?:Primary\s+Cardholder|Account\s+Holder)[:\s]+([A-Z][A-Za-z\s,\.]+?)(?:\n|Account)/i,
    accountNumber: /Account[:\s]*[\*\-]*(\d{4,})/i,
    statementDate: /Statement\s+(?:Closing|Date)[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    paymentDueDate: /Payment\s+Due\s+Date[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    newBalance: /(?:New|Current)\s+Balance[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
    minimumPayment: /Minimum\s+Payment[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
  },
  generic: {
    accountHolder: /(?:Name|Account\s+Holder|Cardholder)[:\s]+([A-Z][A-Za-z\s,\.]+?)(?:\n|Account|\d)/i,
    accountNumber: /Account\s+(?:Number|#)[:\s]*[\*\-]*(\d{4,})/i,
    statementDate: /(?:Statement|Closing)\s+Date[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    paymentDueDate: /(?:Payment\s+)?Due\s+Date[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    newBalance: /(?:New|Current|Total)\s+Balance[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
    minimumPayment: /Minimum\s+(?:Payment|Due)[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
    previousBalance: /Previous\s+Balance[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
    purchases: /(?:Total\s+)?Purchases[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
    cashAdvances: /Cash\s+Advances?[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
    balanceTransfers: /Balance\s+Transfers?[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
    feesCharged: /(?:Fees?\s+Charged|Total\s+Fees)[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
    paymentsCredits: /(?:Payments?|Credits?)[:\s]*-?\$?\s*([\d,]+\.?\d{0,2})/i,
    interestCharged: /Interest\s+Charged[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
    creditLimit: /Credit\s+Limit[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
    availableCredit: /Available\s+Credit[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
    cashLimit: /Cash\s+(?:Advance\s+)?Limit[:\s]*\$?\s*([\d,]+\.?\d{0,2})/i,
    purchaseAPR: /Purchase\s+APR[:\s]*([\d.]+%)/i,
    cashAPR: /Cash\s+(?:Advance\s+)?APR[:\s]*([\d.]+%)/i,
  }
};

export function detectIssuer(text: string): string {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('chase') || lowerText.includes('jpmorgan')) {
    return 'chase';
  }
  if (lowerText.includes('american express') || lowerText.includes('amex')) {
    return 'amex';
  }
  if (lowerText.includes('citi') || lowerText.includes('citibank')) {
    return 'citi';
  }
  if (lowerText.includes('bank of america') || lowerText.includes('bofa')) {
    return 'bofa';
  }
  if (lowerText.includes('capital one')) {
    return 'capitalOne';
  }
  
  return 'generic';
}

function extractWithPatterns(text: string, patternSet: PatternSet): Partial<ExtractedData> {
  const extracted: Partial<ExtractedData> = {};
  
  for (const [key, pattern] of Object.entries(patternSet)) {
    const match = text.match(pattern);
    if (match && match[1]) {
      extracted[key as keyof ExtractedData] = match[1].trim();
    }
  }
  
  return extracted;
}

export function extractData(text: string, fileName?: string, fileSize?: string): ExtractedData {
  const issuerKey = detectIssuer(text);
  const issuerName = {
    chase: 'Chase Bank',
    amex: 'American Express',
    citi: 'Citibank',
    bofa: 'Bank of America',
    capitalOne: 'Capital One',
    generic: 'Unknown Issuer'
  }[issuerKey];
  
  let extracted: Partial<ExtractedData> = {
    fileName,
    fileSize,
    issuer: issuerName
  };
  
  const issuerPatterns = patterns[issuerKey] || patterns.generic;
  const issuerData = extractWithPatterns(text, issuerPatterns);
  extracted = { ...extracted, ...issuerData };
  
  if (Object.keys(issuerData).length < 3) {
    const genericData = extractWithPatterns(text, patterns.generic);
    extracted = { ...extracted, ...genericData };
  }
  
  const statementPeriodMatch = text.match(/(?:Statement\s+Period|Billing\s+Period)[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})\s*-\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
  if (statementPeriodMatch) {
    extracted.statementPeriod = `${statementPeriodMatch[1]} - ${statementPeriodMatch[2]}`;
  }
  
  const addressMatch = text.match(/\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way)[,\s]+[A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5}/i);
  if (addressMatch) {
    extracted.address = addressMatch[0].trim();
  }
  
  return extracted as ExtractedData;
}
