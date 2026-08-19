declare module '@3d-dice/dice-box' {
  export type DiceSides = number | string;

  export type DiceRollResult = {
    sides: DiceSides;
    dieType: string;
    groupId: number;
    rollId: number | string;
    value: number;
    theme: string;
    themeColor: string;
    data?: unknown;
  };

  export type DiceBoxConfig = {
    container: string;
    assetPath: string;
  };

  export default class DiceBox {
    constructor(config: DiceBoxConfig);

    init(): Promise<this>;
    roll(notation: string): Promise<DiceRollResult[]>;
    clear(): this;
  }
}
