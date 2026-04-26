export interface PostMeta {
  Title: string;
  Description?: string;
  Tags?: string[];
  Draft?: boolean;
  Date?: string;
  category: string;
  ym: string;
  slug: string;
}

export const PAGE_SIZE = 10;

export interface Post extends PostMeta {
  body: string;
}
