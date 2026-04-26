declare module "lindera-js/lindera_js.js" {
  interface KuromojiJSToken {
    surface_form: string;
    pos: string;
    basic_form: string;
    [key: string]: unknown;
  }
  export function tokenize(input_text: string): KuromojiJSToken[];
}
