import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useLibraryMutation, useLibraryQuery } from '@sd/client';
import { Algorithm, HashingAlgorithm, Params } from '@sd/client';
import { Button, Dialog, Input, Select, SelectOption } from '@sd/ui';
import { open, save } from '@tauri-apps/api/dialog';
import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
import zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import zxcvbnEnPackage from '@zxcvbn-ts/language-en';
import clsx from 'clsx';
import { Eye, EyeSlash, Lock, Plus } from 'phosphor-react';
import { PropsWithChildren, ReactNode, useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { animated, useTransition } from 'react-spring';

import { ListOfKeys } from '../../../components/key/KeyList';
import { KeyMounter } from '../../../components/key/KeyMounter';
import { SettingsContainer } from '../../../components/settings/SettingsContainer';
import { SettingsHeader } from '../../../components/settings/SettingsHeader';
import { SettingsSubHeader } from '../../../components/settings/SettingsSubHeader';

interface Props extends DropdownMenu.MenuContentProps {
	trigger: React.ReactNode;
	transformOrigin?: string;
	disabled?: boolean;
}

export const KeyMounterDropdown = ({
	trigger,
	children,
	disabled,
	transformOrigin,
	className,
	...props
}: PropsWithChildren<Props>) => {
	const [open, setOpen] = useState(false);

	const transitions = useTransition(open, {
		from: {
			opacity: 0,
			transform: `scale(0.9)`,
			transformOrigin: transformOrigin || 'top'
		},
		enter: { opacity: 1, transform: 'scale(1)' },
		leave: { opacity: -0.5, transform: 'scale(0.95)' },
		config: { mass: 0.4, tension: 200, friction: 10 }
	});

	return (
		<DropdownMenu.Root open={open} onOpenChange={setOpen}>
			<DropdownMenu.Trigger>{trigger}</DropdownMenu.Trigger>
			{transitions(
				(styles, show) =>
					show && (
						<DropdownMenu.Portal forceMount>
							<DropdownMenu.Content forceMount asChild>
								<animated.div
									// most of this is copied over from the `OverlayPanel`
									className={clsx(
										'flex flex-col',
										'z-50 m-2 space-y-1',
										'select-none cursor-default rounded-lg',
										'text-left text-sm text-ink',
										'bg-app-overlay/80 backdrop-blur',
										// 'border border-app-overlay',
										'shadow-2xl shadow-black/60 ',
										className
									)}
									style={styles}
								>
									{children}
								</animated.div>
							</DropdownMenu.Content>
						</DropdownMenu.Portal>
					)
			)}
		</DropdownMenu.Root>
	);
};

export default function KeysSettings() {
	const hasMasterPw = useLibraryQuery(['keys.hasMasterPassword']);
	const setMasterPasswordMutation = useLibraryMutation('keys.setMasterPassword');
	const unmountAll = useLibraryMutation('keys.unmountAll');
	const clearMasterPassword = useLibraryMutation('keys.clearMasterPassword');
	const backupKeystore = useLibraryMutation('keys.backupKeystore');

	const [showMasterPassword, setShowMasterPassword] = useState(false);
	const [showSecretKey, setShowSecretKey] = useState(false);
	const [masterPassword, setMasterPassword] = useState('');
	const [secretKey, setSecretKey] = useState('');
	const MPCurrentEyeIcon = showMasterPassword ? EyeSlash : Eye;
	const SKCurrentEyeIcon = showSecretKey ? EyeSlash : Eye;

	if (!hasMasterPw?.data) {
		return (
			<div className="p-2 mr-20 ml-20 mt-10">
				<div className="relative flex flex-grow mb-2">
					<Input
						value={masterPassword}
						onChange={(e) => setMasterPassword(e.target.value)}
						autoFocus
						type={showMasterPassword ? 'text' : 'password'}
						className="flex-grow !py-0.5"
						placeholder="Master Password"
					/>
					<Button
						onClick={() => setShowMasterPassword(!showMasterPassword)}
						size="icon"
						className="border-none absolute right-[5px] top-[5px]"
					>
						<MPCurrentEyeIcon className="w-4 h-4" />
					</Button>
				</div>

				<div className="relative flex flex-grow mb-2">
					<Input
						value={secretKey}
						onChange={(e) => setSecretKey(e.target.value)}
						type={showSecretKey ? 'text' : 'password'}
						className="flex-grow !py-0.5"
						placeholder="Secret Key"
					/>
					<Button
						onClick={() => setShowSecretKey(!showSecretKey)}
						size="icon"
						className="border-none absolute right-[5px] top-[5px]"
					>
						<SKCurrentEyeIcon className="w-4 h-4" />
					</Button>
				</div>

				<Button
					className="w-full"
					variant="accent"
					disabled={setMasterPasswordMutation.isLoading}
					onClick={() => {
						if (masterPassword !== '' && secretKey !== '') {
							setMasterPassword('');
							setSecretKey('');
							setMasterPasswordMutation.mutate(
								{ password: masterPassword, secret_key: secretKey },
								{
									onError: () => {
										alert('Incorrect information provided.');
									}
								}
							);
						}
					}}
				>
					Unlock
				</Button>
			</div>
		);
	} else {
		return (
			<SettingsContainer>
				<SettingsHeader
					title="Keys"
					description="Manage your keys."
					rightArea={
						<div className="flex flex-row items-center">
							<Button
								size="icon"
								onClick={() => {
									unmountAll.mutate(null);
									clearMasterPassword.mutate(null);
								}}
								variant="outline"
								className="text-ink-faint"
							>
								<Lock className="w-4 h-4 text-ink-faint" />
							</Button>
							<KeyMounterDropdown
								trigger={
									<Button size="icon" variant="outline" className="text-ink-faint">
										<Plus className="w-4 h-4 text-ink-faint" />
									</Button>
								}
							>
								<KeyMounter />
							</KeyMounterDropdown>
						</div>
					}
				/>
				{hasMasterPw.data ? (
					<div className="grid space-y-2">
						<ListOfKeys noKeysMessage={false} />
					</div>
				) : null}

				<SettingsSubHeader title="Password Options" />
				<div className="flex flex-row">
					<MasterPasswordChangeDialog
						trigger={
							<Button size="sm" variant="gray" className="mr-2">
								Change Master Password
							</Button>
						}
					/>
				</div>

				<SettingsSubHeader title="Data Recovery" />
				<div className="flex flex-row">
					<Button
						size="sm"
						variant="gray"
						className="mr-2"
						onClick={() => {
							// not platform-safe, probably will break on web but `platform` doesn't have a save dialog option
							save()?.then((result) => {
								if (result) backupKeystore.mutate(result as string);
							});
						}}
					>
						Backup
					</Button>
					<BackupRestorationDialog
						trigger={
							<Button size="sm" variant="gray" className="mr-2">
								Restore
							</Button>
						}
					/>
				</div>
			</SettingsContainer>
		);
	}
}

// not sure of a suitable place for this function
export const getCryptoSettings = (
	encryptionAlgorithm: string,
	hashingAlgorithm: string
): [Algorithm, HashingAlgorithm] => {
	const algorithm = encryptionAlgorithm as Algorithm;
	let hashing_algorithm: HashingAlgorithm = { Argon2id: 'Standard' };

	switch (hashingAlgorithm) {
		case 'Argon2id-s':
			hashing_algorithm = { Argon2id: 'Standard' as Params };
			break;
		case 'Argon2id-h':
			hashing_algorithm = { Argon2id: 'Hardened' as Params };
			break;
		case 'Argon2id-p':
			hashing_algorithm = { Argon2id: 'Paranoid' as Params };
			break;
	}

	return [algorithm, hashing_algorithm];
};

// not too sure where this should go either
export const MasterPasswordChangeDialog = (props: { trigger: ReactNode }) => {
	type FormValues = {
		masterPassword: string;
		masterPassword2: string;
		encryptionAlgo: string;
		hashingAlgo: string;
	};

	const [secretKey, setSecretKey] = useState('');

	const { register, handleSubmit, getValues, setValue } = useForm<FormValues>({
		defaultValues: {
			masterPassword: '',
			masterPassword2: '',
			encryptionAlgo: 'XChaCha20Poly1305',
			hashingAlgo: 'Argon2id-s'
		}
	});

	const onSubmit: SubmitHandler<FormValues> = (data) => {
		if (data.masterPassword !== '' && data.masterPassword2 !== '') {
			if (data.masterPassword !== data.masterPassword2) {
				alert('Passwords are not the same.');
			} else {
				const [algorithm, hashing_algorithm] = getCryptoSettings(
					data.encryptionAlgo,
					data.hashingAlgo
				);

				changeMasterPassword.mutate(
					{ algorithm, hashing_algorithm, password: data.masterPassword },
					{
						onSuccess: (sk) => {
							setSecretKey(sk);

							setShowSecretKeyDialog(true);
							setShowMasterPasswordDialog(false);
						},
						onError: () => {
							alert('There was an error while changing your master password.');
						}
					}
				);
			}
		}
	};

	const [showMasterPasswordDialog, setShowMasterPasswordDialog] = useState(false);
	const [showSecretKeyDialog, setShowSecretKeyDialog] = useState(false);
	const changeMasterPassword = useLibraryMutation('keys.changeMasterPassword');
	const [showMasterPassword1, setShowMasterPassword1] = useState(false);
	const [showMasterPassword2, setShowMasterPassword2] = useState(false);
	const MP1CurrentEyeIcon = showMasterPassword1 ? EyeSlash : Eye;
	const MP2CurrentEyeIcon = showMasterPassword2 ? EyeSlash : Eye;
	const { trigger } = props;

	return (
		<>
			<form onSubmit={handleSubmit(onSubmit)}>
				<Dialog
					open={showMasterPasswordDialog}
					setOpen={setShowMasterPasswordDialog}
					title="Change Master Password"
					description="Select a new master password for your key manager."
					ctaDanger={true}
					loading={changeMasterPassword.isLoading}
					ctaLabel="Change"
					trigger={trigger}
				>
					<div className="relative flex flex-grow mt-3 mb-2">
						<Input
							className={`flex-grow w-max !py-0.5`}
							placeholder="New Password"
							required
							{...register('masterPassword', { required: true })}
							type={showMasterPassword1 ? 'text' : 'password'}
						/>
						<Button
							onClick={() => setShowMasterPassword1(!showMasterPassword1)}
							size="icon"
							className="border-none absolute right-[5px] top-[5px]"
							type="button"
						>
							<MP1CurrentEyeIcon className="w-4 h-4" />
						</Button>
					</div>
					<div className="relative flex flex-grow mb-2">
						<Input
							className={`flex-grow !py-0.5}`}
							placeholder="New Password (again)"
							required
							{...register('masterPassword2', { required: true })}
							type={showMasterPassword2 ? 'text' : 'password'}
						/>
						<Button
							onClick={() => setShowMasterPassword2(!showMasterPassword2)}
							size="icon"
							className="border-none absolute right-[5px] top-[5px]"
							type="button"
						>
							<MP2CurrentEyeIcon className="w-4 h-4" />
						</Button>
					</div>

					<PasswordMeter password={getValues('masterPassword')} />

					<div className="grid w-full grid-cols-2 gap-4 mt-4 mb-3">
						<div className="flex flex-col">
							<span className="text-xs font-bold">Encryption</span>
							<Select
								className="mt-2"
								value={getValues('encryptionAlgo')}
								onChange={(e) => setValue('encryptionAlgo', e)}
							>
								<SelectOption value="XChaCha20Poly1305">XChaCha20-Poly1305</SelectOption>
								<SelectOption value="Aes256Gcm">AES-256-GCM</SelectOption>
							</Select>
						</div>
						<div className="flex flex-col">
							<span className="text-xs font-bold">Hashing</span>
							<Select
								className="mt-2"
								value={getValues('hashingAlgo')}
								onChange={(e) => setValue('hashingAlgo', e)}
							>
								<SelectOption value="Argon2id-s">Argon2id (standard)</SelectOption>
								<SelectOption value="Argon2id-h">Argon2id (hardened)</SelectOption>
								<SelectOption value="Argon2id-p">Argon2id (paranoid)</SelectOption>
							</Select>
						</div>
					</div>
				</Dialog>
			</form>
			<Dialog
				open={showSecretKeyDialog}
				setOpen={setShowSecretKeyDialog}
				title="Secret Key"
				description="Please store this secret key securely as it is needed to access your key manager."
				ctaAction={() => {
					setShowSecretKeyDialog(false);
				}}
				ctaLabel="Done"
				trigger={<></>}
			>
				<Input
					className="flex-grow w-full mt-3"
					value={secretKey}
					placeholder="Secret Key"
					disabled={true}
				/>
			</Dialog>
		</>
	);
};

export const PasswordMeter = (props: { password: string }) => {
	const ratingColors = ['red-700', 'red-500', 'yellow-300', 'lime-500', 'accent'];

	const ratings = ['Poor', 'Weak', 'Good', 'Strong', 'Perfect'];

	const options = {
		dictionary: {
			...zxcvbnCommonPackage.dictionary,
			...zxcvbnEnPackage.dictionary
		},
		graps: zxcvbnCommonPackage.adjacencyGraphs,
		translations: zxcvbnEnPackage.translations
	};
	zxcvbnOptions.setOptions(options);
	const zx = zxcvbn(props.password);

	const outerDiv = {
		width: '80%',
		height: '5px',
		borderRadius: 80
	};

	const innerDiv = {
		width: `${zx.score !== 0 ? zx.score * 25 : 12.5}%`,
		height: '5px',
		borderRadius: 80
	};

	const text = {
		fontWeight: 750
	};

	return (
		<div className="mt-4 mb-5 relative flex flex-grow">
			<div style={outerDiv} className="mt-2">
				<div style={innerDiv} className={`bg-${ratingColors[zx.score]}`} />
			</div>
			<span
				style={text}
				className={`absolute right-[5px] text-sm pr-1 pl-1 text-${ratingColors[zx.score]}`}
			>
				{ratings[zx.score]}
			</span>
		</div>
	);
};

// not too sure where this should go either
export const BackupRestorationDialog = (props: { trigger: ReactNode }) => {
	type FormValues = {
		masterPassword: string;
		secretKey: string;
		filePath: string;
	};

	const { register, handleSubmit, getValues, setValue } = useForm<FormValues>({
		defaultValues: {
			masterPassword: '',
			secretKey: '',
			filePath: ''
		}
	});

	const onSubmit: SubmitHandler<FormValues> = (data) => {
		if (data.filePath !== '') {
			setValue('masterPassword', '');
			setValue('secretKey', '');
			setValue('filePath', '');
			restoreKeystoreMutation.mutate(
				{
					password: data.masterPassword,
					secret_key: data.secretKey,
					path: data.filePath
				},
				{
					onSuccess: (total) => {
						setTotalKeysImported(total);
						setShowBackupRestorationDialog(false);
						setShowRestorationFinalizationDialog(true);
					},
					onError: () => {
						alert('There was an error while restoring your backup.');
					}
				}
			);
		}
	};

	const [showBackupRestorationDialog, setShowBackupRestorationDialog] = useState(false);
	const [showRestorationFinalizationDialog, setShowRestorationFinalizationDialog] = useState(false);
	const restoreKeystoreMutation = useLibraryMutation('keys.restoreKeystore');

	const [showMasterPassword, setShowMasterPassword] = useState(false);
	const [showSecretKey, setShowSecretKey] = useState(false);

	const [totalKeysImported, setTotalKeysImported] = useState(0);

	const MPCurrentEyeIcon = showMasterPassword ? EyeSlash : Eye;
	const SKCurrentEyeIcon = showSecretKey ? EyeSlash : Eye;
	const { trigger } = props;

	return (
		<>
			<form onSubmit={handleSubmit(onSubmit)}>
				<Dialog
					open={showBackupRestorationDialog}
					setOpen={setShowBackupRestorationDialog}
					title="Restore Keys"
					description="Restore keys from a backup."
					loading={restoreKeystoreMutation.isLoading}
					ctaLabel="Restore"
					trigger={trigger}
				>
					<div className="relative flex flex-grow mt-3 mb-2">
						<Input
							className="flex-grow !py-0.5"
							placeholder="Master Password"
							required
							type={showMasterPassword ? 'text' : 'password'}
							{...register('masterPassword', { required: true })}
						/>
						<Button
							onClick={() => setShowMasterPassword(!showMasterPassword)}
							size="icon"
							className="border-none absolute right-[5px] top-[5px]"
							type="button"
						>
							<MPCurrentEyeIcon className="w-4 h-4" />
						</Button>
					</div>
					<div className="relative flex flex-grow mb-3">
						<Input
							className="flex-grow !py-0.5"
							placeholder="Secret Key"
							{...register('secretKey', { required: true })}
							required
							type={showSecretKey ? 'text' : 'password'}
						/>
						<Button
							onClick={() => setShowSecretKey(!showSecretKey)}
							size="icon"
							className="border-none absolute right-[5px] top-[5px]"
							type="button"
						>
							<SKCurrentEyeIcon className="w-4 h-4" />
						</Button>
					</div>
					<div className="relative flex flex-grow mb-2">
						<Button
							size="sm"
							variant={getValues('filePath') !== '' ? 'accent' : 'gray'}
							type="button"
							onClick={() => {
								open()?.then((result) => {
									if (result) setValue('filePath', result as string);
								});
							}}
						>
							Select File
						</Button>
					</div>
				</Dialog>
			</form>

			<Dialog
				open={showRestorationFinalizationDialog}
				setOpen={setShowRestorationFinalizationDialog}
				title="Import Successful"
				description=""
				ctaAction={() => {
					setShowRestorationFinalizationDialog(false);
				}}
				ctaLabel="Done"
				trigger={<></>}
			>
				<div className="text-sm">
					{totalKeysImported}{' '}
					{totalKeysImported !== 1 ? 'keys were imported.' : 'key was imported.'}
				</div>
			</Dialog>
		</>
	);
};
