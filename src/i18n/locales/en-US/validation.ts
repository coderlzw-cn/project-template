export default {
  // Common
  required: "This field is required",
  invalid: "Invalid input",
  invalidType: "Incorrect data type",
  invalidValue: "The value is outside the allowed range",
  custom: "The input does not meet the requirements",

  // Strings
  string: {
    min: "Must contain at least {{minimum}} characters",
    max: "Must contain no more than {{maximum}} characters",
    length: "Must contain exactly {{length}} characters",
    nonempty: "Cannot be empty",
    includes: "Must contain {{value}}",
    startsWith: "Must start with {{prefix}}",
    endsWith: "Must end with {{suffix}}",
    regex: "Invalid format",
    lowercase: "May contain lowercase letters only",
    uppercase: "May contain uppercase letters only",
  },

  // String formats
  format: {
    email: "Invalid email address",
    url: "Invalid URL",
    httpUrl: "Must be a valid HTTP or HTTPS URL",
    hostname: "Invalid hostname",
    e164: "Invalid phone number",
    emoji: "Must be a valid emoji",
    uuid: "Invalid UUID",
    guid: "Invalid GUID",
    nanoid: "Invalid Nano ID",
    cuid: "Invalid CUID",
    cuid2: "Invalid CUID2",
    ulid: "Invalid ULID",
    xid: "Invalid XID",
    ksuid: "Invalid KSUID",
    ipv4: "Invalid IPv4 address",
    ipv6: "Invalid IPv6 address",
    cidrv4: "Invalid IPv4 CIDR",
    cidrv6: "Invalid IPv6 CIDR",
    mac: "Invalid MAC address",
    base64: "Invalid Base64 format",
    base64url: "Invalid Base64URL format",
    hex: "Invalid hexadecimal format",
    jwt: "Invalid JWT",
    creditCard: "Invalid card number",
    currencyCode: "Invalid currency code",
    iban: "Invalid IBAN",
    hash: "Invalid hash",
    isoDate: "Invalid date format; expected YYYY-MM-DD",
    isoTime: "Invalid time format",
    isoDateTime: "Invalid date-time format",
    isoDuration: "Invalid duration format",
  },

  // Numbers
  number: {
    min: "Must be at least {{minimum}}",
    max: "Must be no greater than {{maximum}}",
    greaterThan: "Must be greater than {{minimum}}",
    lessThan: "Must be less than {{minimum}}",
    integer: "Must be an integer",
    safeInteger: "Must be a safe integer",
    positive: "Must be a positive number",
    nonnegative: "Cannot be negative",
    negative: "Must be a negative number",
    nonpositive: "Cannot be positive",
    multipleOf: "Must be a multiple of {{divisor}}",
    finite: "Must be a finite number",
  },

  // Big integers
  bigint: {
    min: "Must be at least {{minimum}}",
    max: "Must be no greater than {{maximum}}",
    greaterThan: "Must be greater than {{minimum}}",
    lessThan: "Must be less than {{minimum}}",
    positive: "Must be a positive integer",
    nonnegative: "Cannot be negative",
    negative: "Must be a negative integer",
    nonpositive: "Cannot be positive",
    multipleOf: "Must be a multiple of {{divisor}}",
  },

  // Dates
  date: {
    invalid: "Invalid date",
    min: "Date must be on or after {{minimum}}",
    max: "Date must be on or before {{maximum}}",
  },

  // Arrays
  array: {
    min: "Must contain at least {{minimum}} items",
    max: "Must contain no more than {{maximum}} items",
    length: "Must contain exactly {{length}} items",
    nonempty: "Must contain at least one item",
  },

  // Objects
  object: {
    unrecognizedKeys: "Contains unrecognized fields: {{keys}}",
  },

  // Enums and literals
  enum: {
    invalid: "Please select a valid option",
    literal: "The value does not meet the requirements",
  },

  // Unions
  union: {
    invalid: "Input does not match any of the allowed formats",
  },

  // Maps and Sets
  collection: {
    min: "Must contain at least {{minimum}} items",
    max: "Must contain no more than {{maximum}} items",
    size: "Must contain exactly {{size}} items",
    invalidKey: "Invalid collection key",
    invalidElement: "Invalid collection element",
  },

  // Files
  file: {
    min: "File size must be at least {{minimum}}",
    max: "File size must not exceed {{maximum}}",
    mime: "Unsupported file type",
    invalid: "Invalid file",
  },

  // Generic boundary errors
  tooSmall: {
    string: "Length must be at least {{minimum}}",
    number: "Must be at least {{minimum}}",
    bigint: "Must be at least {{minimum}}",
    date: "Date must be on or after {{minimum}}",
    array: "Must contain at least {{minimum}} items",
    set: "Must contain at least {{minimum}} items",
    map: "Must contain at least {{minimum}} items",
    file: "File size must be at least {{minimum}}",
  },

  tooBig: {
    string: "Length must not exceed {{maximum}}",
    number: "Must be no greater than {{maximum}}",
    bigint: "Must be no greater than {{maximum}}",
    date: "Date must be on or before {{maximum}}",
    array: "Must contain no more than {{maximum}} items",
    set: "Must contain no more than {{maximum}} items",
    map: "Must contain no more than {{maximum}} items",
    file: "File size must not exceed {{maximum}}",
  },

  // Numeric precision
  notMultipleOf: "Must be a multiple of {{divisor}}",

  // Other Zod errors
  unrecognizedKeys: "Contains unrecognized fields: {{keys}}",
  invalidUnion: "Input does not match any of the allowed formats",
  invalidKey: "Invalid object or collection key",
  invalidElement: "Invalid object or collection element",
  invalidFormat: "Invalid format",

  isEmail: "Invalid email address",
  isNotEmpty: "Cannot be empty",
  isString: "Must be a string",
  matches: "Invalid format",
} as const;
