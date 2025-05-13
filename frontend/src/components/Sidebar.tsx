import React from 'react';
import clsx from 'clsx';

interface SidebarProps {
  activeLink: string;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ activeLink, isOpen, onClose }: SidebarProps) => {
  return (
    <div className={clsx(
      'sidebar-drawer w-64 bg-white h-screen p-4 fixed inset-y-0 left-0 transform transition-transform duration-200 ease-in-out z-40',
      isOpen ? 'translate-x-0' : '-translate-x-full'
    )}> {/* Added isOpen logic and z-index */}
      <h2 className="text-xl font-bold mb-6">Navigation</h2>
      <nav>
        <ul>
          <li className="mb-2">
            <a href="/companies" className={`block p-2 rounded-md ${activeLink === 'companies' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}> {/* Use primary color for active, muted for hover */}
              Company Management
            </a>
          </li>
          <li>
            <a href="/billing" className={`block p-2 rounded-md ${activeLink === 'billing' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}> {/* Use primary color for active, muted for hover */}
              Billing Management
            </a>
          </li>
          {/* Add other navigation links here */}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;