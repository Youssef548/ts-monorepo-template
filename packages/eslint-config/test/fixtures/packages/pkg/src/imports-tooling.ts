// ILLEGAL: packages/* may not import the tooling packages.
import { tooling } from '../../config/src/index';

export const leaked = tooling;
