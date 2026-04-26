export interface PostMeta {
  Title: string;
  Description?: string;
  Tags?: string[];
  IsDraft?: boolean;
  CreatedAt?: string;
  UpdatedAt?: string;
  category: string;
  ym: string;
  slug: string;
}

export const PAGE_SIZE = 10;

export interface Post extends PostMeta {
  body: string;
}
