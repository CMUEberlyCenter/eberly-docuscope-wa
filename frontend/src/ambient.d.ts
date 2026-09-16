type Optional<T> = T | undefined | null;

type JsonValue =
  string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];
