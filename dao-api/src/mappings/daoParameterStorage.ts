import { getOrCreateParameter } from "../entities/Parameter";
import {
  ParameterAdded,
  ParameterChanged,
  ParameterRemoved,
} from "../../generated/DAOParameterStorage/DAOParameterStorage";
import { getSolidityType } from "../helpers/enums";

export function onParameterAdded(event: ParameterAdded): void {
  const parameter = getOrCreateParameter(event.params.parameter.name);

  parameter.value = event.params.parameter.value;
  parameter.solidityType = getSolidityType(event.params.parameter.solidityType);
  parameter.isPresent = true;

  const changeBlocks = parameter.changeBlocks;

  changeBlocks.push(event.block.number);

  parameter.changeBlocks = changeBlocks;

  parameter.save();
}

export function onParameterChanged(event: ParameterChanged): void {
  const parameter = getOrCreateParameter(event.params.parameter.name);

  parameter.value = event.params.parameter.value;
  parameter.solidityType = getSolidityType(event.params.parameter.solidityType);

  const changeBlocks = parameter.changeBlocks;

  changeBlocks.push(event.block.number);

  parameter.changeBlocks = changeBlocks;

  parameter.save();
}

export function onParameterRemoved(event: ParameterRemoved): void {
  const parameter = getOrCreateParameter(event.params.parameterName);

  parameter.isPresent = false;

  const changeBlocks = parameter.changeBlocks;

  changeBlocks.push(event.block.number);

  parameter.changeBlocks = changeBlocks;

  parameter.save();
}
