import { Target, UTXO } from './types'

export const TX_EMPTY_SIZE = 4 + 1 + 1 + 4
export const TX_INPUT_BASE = 32 + 4 + 1 + 4
export const TX_INPUT_PUBKEYHASH = 107
export const TX_INPUT_SEGWIT = 27
export const TX_INPUT_TAPROOT = 17 // round up 16.5 bytes

export const TX_OUTPUT_BASE = 8 + 1
export const TX_OUTPUT_PUBKEYHASH = 25
export const TX_OUTPUT_SCRIPTHASH = 23
export const TX_OUTPUT_SEGWIT = 22
export const TX_OUTPUT_SEGWIT_SCRIPTHASH = 34

// TODO: make it more secure and add some validations
export function inputBytes(input: UTXO) {
	let bytes = TX_INPUT_BASE

	if (input.redeemScript) {
		bytes += input.redeemScript.length
	}

	if (input.witnessScript) {
		bytes += Math.ceil(input.witnessScript.byteLength / 4)
	} else if (input.isTaproot) {
		if (input.taprootWitness) {
			bytes +=
				Math.ceil(
					(TX_INPUT_TAPROOT * 4 +
						input.taprootWitness.reduce((prev, buffer) => prev + buffer.byteLength, 0)) /
						4,
				) + 1
		} else {
			bytes += TX_INPUT_TAPROOT
		}
	} else if (input.witnessUtxo) {
		bytes += TX_INPUT_SEGWIT
	} else if (!input.redeemScript) {
		bytes += TX_INPUT_PUBKEYHASH
	}

	return bytes
}

export function outputBytes(output: Target) {
	let bytes = TX_OUTPUT_BASE

	if (output.script) {
		bytes += output.script.byteLength
	} else if (
		output.address?.startsWith('bc1') ||
		output.address?.startsWith('tb1') ||
		output.address?.startsWith('bcrt1')
	) {
		if (output.address?.length === 42 || output.address?.length === 44) {
			bytes += TX_OUTPUT_SEGWIT
		} else {
			// taproot fee approximate is same like p2wsh (2 of 3 multisig)
			bytes += TX_OUTPUT_SEGWIT_SCRIPTHASH
		}
	} else if (output.address?.startsWith('3') || output.address?.startsWith('2')) {
		bytes += TX_OUTPUT_SCRIPTHASH
	} else {
		bytes += TX_OUTPUT_PUBKEYHASH
	}

	return bytes
}

// utxo minus the input approximate fee
export function utxoScore(utxo: UTXO, feeRate: number) {
	return utxo.value - feeRate * inputBytes(utxo)
}

// order by descending
export function sortUtxoBasedOnScore(utxos: UTXO[], feeRate: number) {
	return utxos.sort((a, b) => {
		return utxoScore(b, feeRate) - utxoScore(a, feeRate)
	})
}

export function dustThreshold(feeRate: number) {
	// set the value from the highest input type
	return TX_INPUT_BASE + TX_INPUT_PUBKEYHASH * feeRate
}

export function transactionBytes(inputs: UTXO[], outputs: Target[]) {
	return (
		TX_EMPTY_SIZE +
		inputs.reduce((prev, utxo) => prev + inputBytes(utxo), 0) +
		outputs.reduce((prev, target) => prev + outputBytes(target), 0)
	)
}

// blank output for calcualting change fee
export const BLANK_OUTPUT = TX_OUTPUT_BASE + TX_OUTPUT_PUBKEYHASH

export function sumValues<T extends { value?: number }>(range: T[]) {
	return range.reduce((prev, v) => prev + (v.value || 0), 0)
}

export function finalize(
	inputs: UTXO[],
	outputs: Target[],
	feeRate: number,
	changeAddress?: string,
): {
	inputs?: UTXO[]
	outputs?: Target[]
	fee: number
} {
	let changeFee = TX_OUTPUT_BASE + TX_OUTPUT_PUBKEYHASH
	if (changeAddress) {
		changeFee = outputBytes({ address: changeAddress })
	}

	const bytesAccum = transactionBytes(inputs, outputs)
	const feeAfterExtraOutput = feeRate * (bytesAccum + changeFee)
	const remainderAfterExtraOutput = sumValues(inputs) - (sumValues(outputs) + feeAfterExtraOutput)

	// is it worth a change output?
	if (remainderAfterExtraOutput > dustThreshold(feeRate)) {
		outputs = outputs.concat({
			address: changeAddress,
			value: remainderAfterExtraOutput,
		})
	}

	var fee = sumValues(inputs) - sumValues(outputs)
	if (!isFinite(fee)) return { fee: feeRate * bytesAccum }

	return {
		inputs,
		outputs,
		fee,
	}
}
