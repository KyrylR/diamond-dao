export function getSolidityType(raw: i32): string {
  switch (raw) {
    case 0:
      return "NONE";
    case 1:
      return "ADDRESS";
    case 2:
      return "UINT";
    case 3:
      return "STRING";
    case 4:
      return "BYTES";
    case 5:
      return "BOOL";
    default:
      return "NONE";
  }
}

export function getVotingOption(raw: i32): string {
  switch (raw) {
    case 0:
      return "NONE";
    case 1:
      return "FOR";
    case 2:
      return "AGAINST";
    default:
      return "NONE";
  }
}
