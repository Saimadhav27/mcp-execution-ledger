import { Module } from '@nitrostack/core';
import { LedgerTools } from './ledger.tools.js';
import { LedgerResources } from './ledger.resources.js';
import { LedgerPrompts } from './ledger.prompts.js';

@Module({
  name: 'ledger',
  description: 'Execution Ledger',
  controllers: [
    LedgerTools,
    LedgerResources,
    LedgerPrompts
  ]
})
export class LedgerModule {}