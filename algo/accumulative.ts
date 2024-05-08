import { Target, UTXO } from '../types'
import { finalize, inputBytes, sumValues, transactionBytes } from '../utils'

export function accumulative(
	preInputs: UTXO[],
	utxos: UTXO[],
	outputs: Target[],
	feeRate: number,
	changeAddress?: string,
) {
	let bytesAccum = transactionBytes(preInputs, outputs)
	let inAccum = 0
	let inputs: UTXO[] = []
	let outAccum = sumValues(outputs)

	for (const preInput of preInputs) {
		inAccum += preInput.value
		inputs.push(preInput)
	}

	const fee = feeRate * bytesAccum
	if (inAccum > outAccum + fee) {
		return finalize(inputs, outputs, feeRate, changeAddress)
	}

	for (const utxo of utxos) {
		const utxoBytes = inputBytes(utxo)
		const utxoFee = feeRate * utxoBytes
		const utxoValue = utxo.value

		// find another utxo candidate
		if (utxoFee > utxoValue) continue

		bytesAccum += utxoBytes
		inAccum += utxoValue
		inputs.push(utxo)

		const fee = feeRate * bytesAccum

		// let's add others utxos as well
		if (inAccum < outAccum + fee) continue

		return finalize(inputs, outputs, feeRate, changeAddress)
	}

	return {
		fee: feeRate * bytesAccum,
	}
}
