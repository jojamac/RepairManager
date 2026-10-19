import React, { createContext, useContext } from 'react';
import { IAuthRepository } from '../domain/repositories/IAuthRepository';
import { IServiceOrderRepository } from '../domain/repositories/IServiceOrderRepository';
import { IClientRepository } from '../domain/repositories/IClientRepository';
import { IFinancialRepository } from '../domain/repositories/IFinancialRepository';
import { IActivityLogRepository } from '../domain/repositories/IActivityLogRepository';

import { IDigitalTwinRepository } from '../domain/repositories/IDigitalTwinRepository';
import { IRoleRepository } from '../domain/repositories/IRoleRepository';
import { IPermissionRepository } from '../domain/repositories/IPermissionRepository';

import { InMemoryAuthRepository } from './memory/InMemoryAuthRepository';
import { InMemoryServiceOrderRepository } from './memory/InMemoryServiceOrderRepository';
import { InMemoryClientRepository } from './memory/InMemoryClientRepository';
import { InMemoryFinancialRepository } from './memory/InMemoryFinancialRepository';
import { InMemoryActivityLogRepository } from './memory/InMemoryActivityLogRepository';
import { InMemoryDigitalTwinRepository } from './memory/InMemoryDigitalTwinRepository';
import { InMemoryRoleRepository } from './memory/InMemoryRoleRepository';
import { InMemoryPermissionRepository } from './memory/InMemoryPermissionRepository';

import { FirebaseAuthRepository } from './firebase/FirebaseAuthRepository';
import { FirebaseServiceOrderRepository } from './firebase/FirebaseServiceOrderRepository';
import { FirebaseClientRepository } from './firebase/FirebaseClientRepository';
import { FirebaseFinancialRepository } from './firebase/FirebaseFinancialRepository';
import { FirebaseActivityLogRepository } from './firebase/FirebaseActivityLogRepository';
import { FirebaseDigitalTwinRepository } from './firebase/FirebaseDigitalTwinRepository';
import { FirebaseRoleRepository } from './firebase/FirebaseRoleRepository';
import { FirebasePermissionRepository } from './firebase/FirebasePermissionRepository';

import { isFirebaseConfigured } from './firebase/config';

interface RepositoryContainer {
  authRepo: IAuthRepository;
  ordersRepo: IServiceOrderRepository;
  clientsRepo: IClientRepository;
  financeRepo: IFinancialRepository;
  logsRepo: IActivityLogRepository;
  digitalTwinRepo: IDigitalTwinRepository;
  rolesRepo: IRoleRepository;
  permissionsRepo: IPermissionRepository;
  providerType: 'memory' | 'firebase';
}

const RepositoryContext = createContext<RepositoryContainer | null>(null);

export const RepositoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const providerEnv = import.meta.env.VITE_BACKEND_PROVIDER;
  const useFirebase = providerEnv === 'firebase' && isFirebaseConfigured;

  const container: RepositoryContainer = React.useMemo(() => {
    if (useFirebase) {
      console.log('EnTuCel: Inicializando repositorios con FIREBASE backend');
      return {
        authRepo: new FirebaseAuthRepository(),
        ordersRepo: new FirebaseServiceOrderRepository(),
        clientsRepo: new FirebaseClientRepository(),
        financeRepo: new FirebaseFinancialRepository(),
        logsRepo: new FirebaseActivityLogRepository(),
        digitalTwinRepo: new FirebaseDigitalTwinRepository(),
        rolesRepo: new FirebaseRoleRepository(),
        permissionsRepo: new FirebasePermissionRepository(),
        providerType: 'firebase',
      };
    } else {
      if (providerEnv === 'firebase') {
        console.warn('EnTuCel: Se solicitó FIREBASE, pero las credenciales no están configuradas en .env. Usando MOCK MEMORY backend.');
      } else {
        console.log('EnTuCel: Inicializando repositorios con MOCK MEMORY (LocalStorage) backend');
      }
      return {
        authRepo: new InMemoryAuthRepository(),
        ordersRepo: new InMemoryServiceOrderRepository(),
        clientsRepo: new InMemoryClientRepository(),
        financeRepo: new InMemoryFinancialRepository(),
        logsRepo: new InMemoryActivityLogRepository(),
        digitalTwinRepo: new InMemoryDigitalTwinRepository(),
        rolesRepo: new InMemoryRoleRepository(),
        permissionsRepo: new InMemoryPermissionRepository(),
        providerType: 'memory',
      };
    }
  }, [useFirebase, providerEnv]);

  return (
    <RepositoryContext.Provider value={container}>
      {children}
    </RepositoryContext.Provider>
  );
};

export const useRepositories = () => {
  const context = useContext(RepositoryContext);
  if (!context) {
    throw new Error('useRepositories debe usarse dentro de un RepositoryProvider');
  }
  return context;
};
