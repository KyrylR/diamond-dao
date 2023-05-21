import {
  MemberAdded,
  MemberRemoved,
} from "../../generated/DAOMemberStorage/DAOMemberStorage";
import { getOrCreateExpert } from "../entities/Expert";

export function onMemberAdded(event: MemberAdded): void {
  const expert = getOrCreateExpert(event.params.member);

  const expertStartBlocks = expert.startBlocks;
  const expertStartTimestamps = expert.startTimestamps;

  expertStartBlocks.push(event.block.number);
  expertStartTimestamps.push(event.block.timestamp);

  expert.startBlocks = expertStartBlocks;
  expert.startTimestamps = expertStartTimestamps;
  expert.group = event.params.group;

  expert.save();
}

export function onMemberRemoved(event: MemberRemoved): void {
  const expert = getOrCreateExpert(event.params.member);

  const expertEndBlocks = expert.endBlocks;
  const expertEndTimestamps = expert.endTimestamps;

  expertEndBlocks.push(event.block.number);
  expertEndTimestamps.push(event.block.timestamp);

  expert.endBlocks = expertEndBlocks;
  expert.endTimestamps = expertEndTimestamps;
  expert.group = "";

  expert.save();
}
