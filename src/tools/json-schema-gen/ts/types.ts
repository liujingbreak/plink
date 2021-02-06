export interface Setting {
  /** This is doc comments of helleworld
   * @field hellow
   */
  helloWord?: string;

  // Try union type property
  tryUnionType: 'type1' | 'type2';

  /** A TypeLiteral */
  structureType: {abc: string;};
}

export {Setting as Config};
