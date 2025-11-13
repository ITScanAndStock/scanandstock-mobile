export class StatsResponse {
  public content: StatsModel[] = [];
  public activeSort: ActiveSort = new ActiveSort();
  public sorts: string[] = [];
  public filters: Filter[] = [];
  public filteredCount: number = 0;
  public total: number = 0;
}

export class StatsModel {
  public designation: string = "";
  public mvmtDateTime: string = "";
  public price: number = 0;
  public provider: string = "";
  public quantity: number = 0;
  public totalStock: number = 0;
  public type: string = "";
  public userEmail: string = "";
  public userName: string = "";
  public action: string = "";
}

class ActiveSort {
  public attribute: string = "";
  public order: Sort = Sort.ASC;
}

enum Sort {
  ASC, DESC
}

class Filter {
  public filter: string = "";
  public label: string = "";
  public values: FilterValues[] = [];
}

class FilterValues {
  public label: string = "";
  public value: string = "";
  public count: number = 0;
}