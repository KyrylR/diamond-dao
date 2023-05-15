export enum FacetCutAction {
  Add,
  Replace,
  Remove,
}

export interface FaucetCut {
  facetAddress: string;
  action: FacetCutAction;
  functionSelectors: string[];
}

export interface FuncNameToSignature {
  [funcName: string]: string;
}
