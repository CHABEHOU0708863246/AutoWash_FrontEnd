export class PaginatedResponse<T> {
  items: T[] = [];
  pageNumber: number = 1;
  pageSize: number = 10;
  totalPages: number = 0;
  totalCount: number = 0;

  constructor(items: T[] = [], count: number = 0, pageNumber: number = 1, pageSize: number = 10) {
    this.items = items;
    this.pageNumber = pageNumber;
    this.pageSize = pageSize;
    this.totalCount = count;
    this.totalPages = Math.ceil(count / pageSize);
  }

  get hasPreviousPage(): boolean {
    return this.pageNumber > 1;
  }

  get hasNextPage(): boolean {
    return this.pageNumber < this.totalPages;
  }
}
