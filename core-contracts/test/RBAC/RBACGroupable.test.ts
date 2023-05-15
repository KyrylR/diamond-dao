import { expect } from "chai";
import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { RBACGroupableMock } from "@ethers-v5";

describe("RBACGroupable", () => {
  let OWNER: SignerWithAddress;
  let SECOND: SignerWithAddress;

  let rbac: RBACGroupableMock;

  before("setup", async () => {
    [OWNER, SECOND] = await ethers.getSigners();
  });

  beforeEach("setup", async () => {
    const RBACGroupableMock = await ethers.getContractFactory("RBACGroupableMock");
    rbac = await RBACGroupableMock.deploy();

    await rbac.__RBACGroupableMock_init();
  });

  describe("__RBACGroupable_init", () => {
    it("should not initialize twice", async () => {
      await expect(rbac.mockInit()).to.be.revertedWith("RBAC: already initialized");
    });
  });

  context("if roles are created", () => {
    const roles = [
      {
        name: "role1",
        resourcesWithPermissions: [
          {
            resource: "resource1",
            permissions: ["permission1"],
          },
        ],
      },
      {
        name: "role2",
        resourcesWithPermissions: [
          {
            resource: "resource2",
            permissions: ["permission2"],
          },
        ],
      },
      {
        name: "role3",
        resourcesWithPermissions: [
          {
            resource: "resource3",
            permissions: ["permission3"],
          },
        ],
      },
    ];

    const GROUP_ALL_ROLES = "ALL_ROLES_GROUP";
    const GROUP_ROLES01 = "ROLES_0_1";
    const GROUP_ROLES12 = "ROLES_1_2";

    const ALL_ROLES = [roles[0].name, roles[1].name, roles[2].name];
    const ROLES_01 = [roles[0].name, roles[1].name];
    const ROLES_12 = [roles[1].name, roles[2].name];

    beforeEach(async () => {
      for (const role of roles) {
        await rbac.addPermissionsToRole(role.name, role.resourcesWithPermissions, true);
      }
    });

    describe("grantGroupRoles", () => {
      it("should revert if no permission", async () => {
        await expect(
          rbac.connect(SECOND).grantGroupRoles(GROUP_ALL_ROLES, ALL_ROLES),
          "RBAC: no CREATE permission for resource RBAC_RESOURCE"
        );
      });

      it("should revert if no roles provided", async () => {
        await expect(rbac.grantGroupRoles(GROUP_ALL_ROLES, []), "RBACGroupable: empty roles");
      });

      it("should grant group roles if all conditions are met", async () => {
        expect(await rbac.grantGroupRoles(GROUP_ALL_ROLES, ALL_ROLES)).to.emit(rbac, "GrantedGroupRoles");

        expect(await rbac.getGroupRoles(GROUP_ALL_ROLES)).to.be.deep.equal(ALL_ROLES);
      });
    });

    context("if groups are created", () => {
      beforeEach(async () => {
        await rbac.grantGroupRoles(GROUP_ALL_ROLES, ALL_ROLES);
        await rbac.grantGroupRoles(GROUP_ROLES01, ROLES_01);
        await rbac.grantGroupRoles(GROUP_ROLES12, ROLES_12);
      });

      describe("revokeGroupRoles", () => {
        it("should revert if no permission", async () => {
          await expect(
            rbac.connect(SECOND).revokeGroupRoles(GROUP_ALL_ROLES, ROLES_01),
            "RBAC: no DELETE permission for resource RBAC_RESOURCE"
          );
        });

        it("should revert if no roles provided", async () => {
          await expect(rbac.revokeGroupRoles(GROUP_ALL_ROLES, []), "RBACGroupable: empty roles");
        });

        it("should revoke group roles if all conditions are met", async () => {
          expect(await rbac.revokeGroupRoles(GROUP_ALL_ROLES, ROLES_01)).to.emit(rbac, "RevokedGroupRoles");

          expect(await rbac.getGroupRoles(GROUP_ALL_ROLES)).to.be.deep.equal([roles[2].name]);
        });
      });

      describe("addUserToGroups", () => {
        it("should revert if no permission", async () => {
          await expect(
            rbac.connect(SECOND).addUserToGroups(SECOND.address, [GROUP_ROLES01, GROUP_ROLES12]),
            "RBAC: no CREATE permission for resource RBAC_RESOURCE"
          );
        });

        it("should revert if no groups provided", async () => {
          await expect(rbac.addUserToGroups(SECOND.address, []), "RBACGroupable: empty groups");
        });

        it("should add the user to groups if all conditions are met", async () => {
          expect(await rbac.addUserToGroups(SECOND.address, [GROUP_ROLES01, GROUP_ROLES12])).to.emit(
            rbac,
            "AddedToGroups"
          );

          expect(await rbac.getUserGroups(SECOND.address)).to.be.deep.equal([GROUP_ROLES01, GROUP_ROLES12]);
        });
      });

      context("if the user is assigned to groups", () => {
        beforeEach(async () => {
          await rbac.addUserToGroups(SECOND.address, [GROUP_ROLES01, GROUP_ROLES12]);
        });

        describe("removeUserFromGroups", () => {
          it("should revert if no permission", async () => {
            await expect(
              rbac.connect(SECOND).removeUserFromGroups(SECOND.address, [GROUP_ROLES01]),
              "RBAC: no DELETE permission for resource RBAC_RESOURCE"
            );
          });

          it("should revert if no groups provided", async () => {
            await expect(rbac.removeUserFromGroups(SECOND.address, []), "RBACGroupable: empty groups");
          });

          it("should remove the user from groups if all conditions are met", async () => {
            expect(await rbac.removeUserFromGroups(SECOND.address, [GROUP_ROLES01])).to.emit(rbac, "RemovedFromGroups");

            expect(await rbac.getUserGroups(SECOND.address)).to.be.deep.equal([GROUP_ROLES12]);
          });
        });

        describe("hasPermission", () => {
          it("should have the permission if only the group role", async () => {
            expect(
              await rbac.hasPermission(
                SECOND.address,
                roles[0].resourcesWithPermissions[0].resource,
                roles[0].resourcesWithPermissions[0].permissions[0]
              )
            ).to.be.true;
          });

          it("should have the permission if only own role", async () => {
            expect(await rbac.hasPermission(OWNER.address, "*", "*")).to.be.true;
          });

          it("should not have the permission if the user has an antipermission", async () => {
            const BANNED_ZERO_ROLE = "BANNED_ZERO_ROLE";

            await rbac.addPermissionsToRole(BANNED_ZERO_ROLE, roles[0].resourcesWithPermissions, false);
            await rbac.grantRoles(SECOND.address, [BANNED_ZERO_ROLE]);

            expect(
              await rbac.hasPermission(
                SECOND.address,
                roles[0].resourcesWithPermissions[0].resource,
                roles[0].resourcesWithPermissions[0].permissions[0]
              )
            ).to.be.false;
          });

          it("should not have the permission if the group has an antipermission", async () => {
            const BANNED_ZERO_ROLE = "BANNED_ZERO_ROLE";

            await rbac.addPermissionsToRole(BANNED_ZERO_ROLE, roles[0].resourcesWithPermissions, false);
            await rbac.grantGroupRoles(GROUP_ROLES12, [BANNED_ZERO_ROLE]);

            expect(
              await rbac.hasPermission(
                SECOND.address,
                roles[0].resourcesWithPermissions[0].resource,
                roles[0].resourcesWithPermissions[0].permissions[0]
              )
            ).to.be.false;
          });

          it("should not have the permission if it is not assigned", async () => {
            expect(await rbac.hasPermission(SECOND.address, "*", "*")).to.be.false;
          });
        });
      });
    });
  });
});
