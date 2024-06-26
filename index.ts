import { accumulative } from './algo'
import { Target, UTXO } from './types'
import { sortUtxoBasedOnScore } from './utils'

export function coinSelect(
	preInputs: UTXO[],
	utxos: UTXO[],
	outputs: Target[],
	feeRate: number,
	changeAddress?: string,
	changeOutput = true,
) {
	const orderedUtxos = sortUtxoBasedOnScore(utxos, feeRate)
	return accumulative(preInputs, orderedUtxos, outputs, feeRate, changeAddress, changeOutput)
}

export * from './algo'
export * from './types'
export * from './utils'
