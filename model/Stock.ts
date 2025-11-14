export class StockModel {
  public stockId: number = 0;
  public stockDetailsId: number = 0;
  public code: string = '';
  public action: Method | string = '';
  public expirationDate: string = '';
  public batchNumber: string = '';
  public updateUnit: boolean = false;
  public force: boolean = false;
}

export class StockModelBig {
  public stockId: number = 0;
  public stockDetailsId: number = 0;
  public code: string = '';
  public action: Method | string = '';
  public expirationDate: string = '';
  public batchNumber: string = '';
  public updateUnit: boolean = false;
  public force: boolean = false;
  public quantity: number = 0;
}

export enum Method {
  increase,
  decrease,
}
