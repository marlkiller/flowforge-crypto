declare module "tailwind-merge" {
  export function twMerge(...classLists: Array<string | undefined | null | false>): string;
}
