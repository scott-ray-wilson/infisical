import { faServer } from "@fortawesome/free-solid-svg-icons";
import { Link, useLocation } from "@tanstack/react-router";
import { motion } from "framer-motion";

import { CreateOrgModal } from "@app/components/organization/CreateOrgModal";
import { Tab, TabList, Tabs } from "@app/components/v2";
import { useUser } from "@app/context";
import { usePopUp } from "@app/hooks";

type Props = {
  isHidden?: boolean;
};

export const OrgNavBar = ({ isHidden }: Props) => {
  const { user } = useUser();

  const { popUp, handlePopUpToggle } = usePopUp(["createOrg"] as const);

  const { pathname } = useLocation();

  return (
    <>
      {!isHidden && (
        <div className="dark dark hidden w-full flex-col overflow-x-hidden border-b border-mineshaft-600 bg-bunker-900 px-4 pt-0.5 md:flex">
          <motion.div
            key="menu-project-items"
            initial={{ x: 150 }}
            animate={{ x: 0 }}
            exit={{ x: 150 }}
            transition={{ duration: 0.2 }}
            className=""
          >
            <nav className="w-full">
              <Tabs value="selected">
                <TabList className="border-b-0">
                  <Link to="/organization/projects">
                    {({ isActive }) => (
                      <Tab variant="org" value={isActive ? "selected" : ""}>
                        Overview
                      </Tab>
                    )}
                  </Link>
                  <Link to="/organization/access-management">
                    {({ isActive }) => (
                      <Tab
                        variant="org"
                        value={
                          isActive ||
                          pathname.match(
                            /organization\/members|organization\/identities|organization\/groups|organization\/roles/
                          )
                            ? "selected"
                            : ""
                        }
                      >
                        Access Control
                      </Tab>
                    )}
                  </Link>
                  <Link to="/organization/app-connections">
                    {({ isActive }) => (
                      <Tab variant="org" value={isActive ? "selected" : ""}>
                        App Connections
                      </Tab>
                    )}
                  </Link>
                  <Link to="/organization/networking">
                    {({ isActive }) => (
                      <Tab variant="org" value={isActive ? "selected" : ""}>
                        Networking
                      </Tab>
                    )}
                  </Link>
                  <Link to="/organization/audit-logs">
                    {({ isActive }) => (
                      <Tab variant="org" value={isActive ? "selected" : ""}>
                        Audit Logs
                      </Tab>
                    )}
                  </Link>
                  <Link to="/organization/settings">
                    {({ isActive }) => (
                      <Tab variant="org" value={isActive ? "selected" : ""}>
                        Settings
                      </Tab>
                    )}
                  </Link>
                  <Link to="/organization/billing">
                    {({ isActive }) => (
                      <Tab variant="org" value={isActive ? "selected" : ""}>
                        Usage & Billing
                      </Tab>
                    )}
                  </Link>
                  <Link className="mr-auto" to="/organization/secret-sharing">
                    {({ isActive }) => (
                      <Tab value={isActive ? "selected" : ""} variant="org">
                        Secret Sharing
                      </Tab>
                    )}
                  </Link>
                </TabList>
              </Tabs>
            </nav>
          </motion.div>
        </div>
      )}

      {/*        <Menu> */}
      {/*          <MenuGroup title="Overview"> */}
      {/*            <Link to="/organization/projects"> */}
      {/*              {({ isActive }) => ( */}
      {/*                <MenuItem variant="org" isSelected={isActive}> */}
      {/*                  <div className="mx-1 flex gap-2"> */}
      {/*                    <div className="w-6"> */}
      {/*                      <FontAwesomeIcon icon={faTable} /> */}
      {/*                    </div> */}
      {/*                    Overview */}
      {/*                  </div> */}
      {/*                </MenuItem> */}
      {/*              )} */}
      {/*            </Link> */}
      {/*            <Link to="/organization/access-management"> */}
      {/*              {({ isActive }) => ( */}
      {/*                <MenuItem variant="org" isSelected={isActive}> */}
      {/*                  <div className="mx-1 flex gap-2"> */}
      {/*                    <div className="w-6"> */}
      {/*                      <FontAwesomeIcon icon={faUsers} /> */}
      {/*                    </div> */}
      {/*                    Organization Access */}
      {/*                  </div> */}
      {/*                </MenuItem> */}
      {/*              )} */}
      {/*            </Link> */}
      {/*            <Link to="/organization/billing"> */}
      {/*              {({ isActive }) => ( */}
      {/*                <MenuItem variant="org" isSelected={isActive}> */}
      {/*                  <div className="mx-1 flex gap-2"> */}
      {/*                    <div className="w-6"> */}
      {/*                      <FontAwesomeIcon icon={faMoneyBill} className="mr-4" /> */}
      {/*                    </div> */}
      {/*                    Usage & Billing */}
      {/*                  </div> */}
      {/*                </MenuItem> */}
      {/*              )} */}
      {/*            </Link> */}
      {/*            <Link to="/organization/audit-logs"> */}
      {/*              {({ isActive }) => ( */}
      {/*                <MenuItem variant="org" isSelected={isActive}> */}
      {/*                  <div className="mx-1 flex gap-2"> */}
      {/*                    <div className="w-6"> */}
      {/*                      <FontAwesomeIcon icon={faBook} className="mr-4" /> */}
      {/*                    </div> */}
      {/*                    Audit Logs */}
      {/*                  </div> */}
      {/*                </MenuItem> */}
      {/*              )} */}
      {/*            </Link> */}
      {/*            <Link to="/organization/settings"> */}
      {/*              {({ isActive }) => ( */}
      {/*                <MenuItem variant="org" isSelected={isActive}> */}
      {/*                  <div className="mx-1 flex gap-2"> */}
      {/*                    <div className="w-6"> */}
      {/*                      <FontAwesomeIcon icon={faCog} className="mr-4" /> */}
      {/*                    </div> */}
      {/*                    Organization Settings */}
      {/*                  </div> */}
      {/*                </MenuItem> */}
      {/*              )} */}
      {/*            </Link> */}
      {/*          </MenuGroup> */}
      {/*          <MenuGroup title="Resources"> */}
      {/*            <Link to="/organization/app-connections"> */}
      {/*              {({ isActive }) => ( */}
      {/*                <MenuItem variant="org" isSelected={isActive}> */}
      {/*                  <div className="mx-1 flex gap-2"> */}
      {/*                    <div className="w-6"> */}
      {/*                      <FontAwesomeIcon icon={faPlug} className="mr-4" /> */}
      {/*                    </div> */}
      {/*                    App Connections */}
      {/*                  </div> */}
      {/*                </MenuItem> */}
      {/*              )} */}
      {/*            </Link> */}
      {/*            <Link to="/organization/networking"> */}
      {/*              {({ isActive }) => ( */}
      {/*                <MenuItem variant="org" isSelected={isActive}> */}
      {/*                  <div className="mx-1 flex gap-2"> */}
      {/*                    <div className="w-6"> */}
      {/*                      <FontAwesomeIcon icon={faNetworkWired} className="mr-4" /> */}
      {/*                    </div> */}
      {/*                    Networking */}
      {/*                  </div> */}
      {/*                </MenuItem> */}
      {/*              )} */}
      {/*            </Link> */}
      {/*          </MenuGroup> */}
      {/*        </Menu> */}
      {/*        <div className="grow" /> */}
      {/*        <Menu> */}
      {/*          {subscription && */}
      {/*            subscription.slug === "starter" && */}
      {/*            !subscription.has_used_trial && ( */}
      {/*              <Tooltip content="Start Free Pro Trial"> */}
      {/*                <MenuItem */}
      {/*                  variant="org" */}
      {/*                  className="relative flex items-center gap-2 overflow-hidden text-sm text-mineshaft-400 hover:text-mineshaft-300" */}
      {/*                  leftIcon={ */}
      {/*                    <FontAwesomeIcon */}
      {/*                      className="mx-1 inline-block shrink-0" */}
      {/*                      icon={faInfinity} */}
      {/*                    /> */}
      {/*                  } */}
      {/*                  onClick={async () => { */}
      {/*                    if (!subscription || !currentOrg) return; */}

      {/*                    // direct user to start pro trial */}
      {/*                    const url = await mutateAsync({ */}
      {/*                      orgId: currentOrg.id, */}
      {/*                      success_url: window.location.href */}
      {/*                    }); */}

      {/*                    window.location.href = url; */}
      {/*                  }} */}
      {/*                > */}
      {/*                  Pro Trial */}
      {/*                </MenuItem> */}
      {/*              </Tooltip> */}
      {/*            )} */}
      {/*          <Link to="/organization/secret-sharing"> */}
      {/*            <MenuItem */}
      {/*              variant="org" */}
      {/*              className="relative flex items-center gap-2 overflow-hidden text-sm text-mineshaft-400 hover:text-mineshaft-300" */}
      {/*              leftIcon={ */}
      {/*                <div className="w-6"> */}
      {/*                  <FontAwesomeIcon className="mx-1 inline-block shrink-0" icon={faShare} /> */}
      {/*                </div> */}
      {/*              } */}
      {/*            > */}
      {/*              Share Secret */}
      {/*            </MenuItem> */}
      {/*          </Link> */}
      {/*          {user.superAdmin && ( */}
      {/*            <Link to="/admin"> */}
      {/*              <MenuItem */}
      {/*                variant="org" */}
      {/*                className="relative flex items-center gap-2 overflow-hidden text-sm text-mineshaft-400 hover:text-mineshaft-300" */}
      {/*                leftIcon={ */}
      {/*                  <div className="w-6"> */}
      {/*                    <FontAwesomeIcon */}
      {/*                      className="mx-1 inline-block shrink-0" */}
      {/*                      icon={faUserTie} */}
      {/*                    /> */}
      {/*                  </div> */}
      {/*                } */}
      {/*              > */}
      {/*                Server Console */}
      {/*              </MenuItem> */}
      {/*            </Link> */}
      {/*          )} */}
      {/*        </Menu> */}
      {/*      </nav> */}
      {/*    </motion.aside> */}
      {/*  )} */}
      {/* </AnimatePresence> */}
      <CreateOrgModal
        isOpen={popUp?.createOrg?.isOpen}
        onClose={() => handlePopUpToggle("createOrg", false)}
      />
    </>
  );
};
