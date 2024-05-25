/**
 * the shape of a type which is declared as part of a particular glossary
 */
export interface OfGlossary<G extends string> {
  /**
   * a metadata identifier for the glossary this domain object is part of
   */
  _dglo: G;
}

/**
 * .what = extends the decorated type to specify which glossary it is a part of
 * .why =
 *   - explicitly declare types as part of a domain-glossary
 *     - for example, assign ""
 *   - ensure that a simple type alias does not get reduced by typescript
 *     - e.g., `type UniDate = string` would get introspected as just `string`
 *     - but., `type UniDate = AsOfGlossary<string, 'uni-date'>` will get introspected as `UniDate`
 */
export type AsOfGlossary<
  T,
  G extends string,
  /**
   * whether the _dglo annotation is required
   *
   * usecase
   * - allows requirement of having gone through an explicit type check before attribute can be assigned
   * - true by default, for pit of success, fail-fast safety
   *
   * example
   * ```ts
   * type TimestampWithReq = OfGlossary<string, 'time'>
   * type TimestampWithout = OfGlossary<string, 'time', false>
   *
   * const isOfTimestamp = (input: string): input is TimestampWithReq => {...};
   *
   * const input = '2024, Nov 1';
   * const attemptOne: TimestampWithReq =  // 🛑 fails as `string is not assignable to TimestampWithReq`
   * if (isOfTimestamp(input)) {
   *   const attemptTwo: TimestampWithReq = input; // ✅ passes as the domain check confirmed it is the correct shape
   * }
   * const attemptThree: TimestampWithoutReq = input; // ✅ passes as there was no requirement to ensure it passed through the domain check
   * ```
   */
  R = true,
> = R extends true ? T & OfGlossary<G> : T & Partial<OfGlossary<G>>;
