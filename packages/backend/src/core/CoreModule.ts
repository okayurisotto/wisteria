/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Module } from '@nestjs/common';
import { AccountMoveService } from './AccountMoveService.js';
import { AccountUpdateService } from './AccountUpdateService.js';
import { AiService } from './AiService.js';
import { AnnouncementService } from './AnnouncementService.js';
import { AntennaService } from './AntennaService.js';
import { AppLockService } from './AppLockService.js';
import { AchievementService } from './AchievementService.js';
import { AvatarDecorationService } from './AvatarDecorationService.js';
import { CaptchaService } from './CaptchaService.js';
import { CreateSystemUserService } from './CreateSystemUserService.js';
import { CustomEmojiService } from './CustomEmojiService.js';
import { DeleteAccountService } from './DeleteAccountService.js';
import { DownloadService } from './DownloadService.js';
import { DriveService } from './DriveService.js';
import { EmailService } from './EmailService.js';
import { FederatedInstanceService } from './FederatedInstanceService.js';
import { FetchInstanceMetadataService } from './FetchInstanceMetadataService.js';
import { GlobalEventService } from './GlobalEventService.js';
import { HashtagService } from './HashtagService.js';
import { HttpRequestService } from './HttpRequestService.js';
import { IdService } from './IdService.js';
import { ImageProcessingService } from './ImageProcessingService.js';
import { InstanceActorService } from './InstanceActorService.js';
import { InternalStorageService } from './InternalStorageService.js';
import { MetaService } from './MetaService.js';
import { MfmService } from './MfmService.js';
import { ModerationLogService } from './ModerationLogService.js';
import { NoteCreateService } from './NoteCreateService.js';
import { NoteDeleteService } from './NoteDeleteService.js';
import { NotePiningService } from './NotePiningService.js';
import { NoteReadService } from './NoteReadService.js';
import { NotificationService } from './NotificationService.js';
import { PollService } from './PollService.js';
import { PushNotificationService } from './PushNotificationService.js';
import { QueryService } from './QueryService.js';
import { ReactionCreateService } from './ReactionCreateService.js';
import { RelayService } from './RelayService.js';
import { RoleService } from './RoleService.js';
import { S3Service } from './S3Service.js';
import { SignupService } from './SignupService.js';
import { WebAuthnService } from './WebAuthnService.js';
import { UserBlockingBlockService } from './UserBlockingBlockService.js';
import { UserBlockingCheckService } from './UserBlockingCheckService.js';
import { UserBlockingUnblockService } from './UserBlockingUnblockService.js';
import { CacheService } from './CacheService.js';
import { UserService } from './UserService.js';
import { UserFollowingService } from './UserFollowingService.js';
import { UserKeypairService } from './UserKeypairService.js';
import { UserListService } from './UserListService.js';
import { UserMutingService } from './UserMutingService.js';
import { UserSuspendService } from './UserSuspendService.js';
import { UserAuthService } from './UserAuthService.js';
import { VideoProcessingService } from './VideoProcessingService.js';
import { WebhookService } from './WebhookService.js';
import { ProxyAccountService } from './ProxyAccountService.js';
import { UtilityService } from './UtilityService.js';
import { FileInfoService } from './FileInfoService.js';
import { SearchService } from './SearchService.js';
import { ClipService } from './ClipService.js';
import { FeaturedService } from './FeaturedService.js';
import { FanoutTimelineService } from './FanoutTimelineService.js';
import { ChannelFollowingService } from './ChannelFollowingService.js';
import { RegistryApiService } from './RegistryApiService.js';
import { ReversiService } from './ReversiService.js';

import { ChartLoggerService } from './chart/ChartLoggerService.js';
import FederationChart from './chart/charts/federation.js';
import NotesChart from './chart/charts/notes.js';
import UsersChart from './chart/charts/users.js';
import ActiveUsersChart from './chart/charts/active-users.js';
import InstanceChart from './chart/charts/instance.js';
import PerUserNotesChart from './chart/charts/per-user-notes.js';
import PerUserPvChart from './chart/charts/per-user-pv.js';
import DriveChart from './chart/charts/drive.js';
import PerUserReactionsChart from './chart/charts/per-user-reactions.js';
import PerUserFollowingChart from './chart/charts/per-user-following.js';
import PerUserDriveChart from './chart/charts/per-user-drive.js';
import ApRequestChart from './chart/charts/ap-request.js';
import { ChartManagementService } from './chart/ChartManagementService.js';

import { AbuseUserReportEntityService } from './entities/AbuseUserReportEntityService.js';
import { AntennaEntityService } from './entities/AntennaEntityService.js';
import { AppEntityService } from './entities/AppEntityService.js';
import { AuthSessionEntityService } from './entities/AuthSessionEntityService.js';
import { BlockingEntityService } from './entities/BlockingEntityService.js';
import { ChannelEntityService } from './entities/ChannelEntityService.js';
import { ClipEntityService } from './entities/ClipEntityService.js';
import { DriveFileEntityService } from './entities/DriveFileEntityService.js';
import { DriveFolderEntityService } from './entities/DriveFolderEntityService.js';
import { EmojiEntityService } from './entities/EmojiEntityService.js';
import { FollowingEntityService } from './entities/FollowingEntityService.js';
import { FollowRequestEntityService } from './entities/FollowRequestEntityService.js';
import { GalleryLikeEntityService } from './entities/GalleryLikeEntityService.js';
import { GalleryPostEntityService } from './entities/GalleryPostEntityService.js';
import { HashtagEntityService } from './entities/HashtagEntityService.js';
import { InstanceEntityService } from './entities/InstanceEntityService.js';
import { InviteCodeEntityService } from './entities/InviteCodeEntityService.js';
import { ModerationLogEntityService } from './entities/ModerationLogEntityService.js';
import { MutingEntityService } from './entities/MutingEntityService.js';
import { RenoteMutingEntityService } from './entities/RenoteMutingEntityService.js';
import { NoteEntityService } from './entities/NoteEntityService.js';
import { NoteFavoriteEntityService } from './entities/NoteFavoriteEntityService.js';
import { NoteReactionEntityService } from './entities/NoteReactionEntityService.js';
import { NotificationEntityService } from './entities/NotificationEntityService.js';
import { PageEntityService } from './entities/PageEntityService.js';
import { PageLikeEntityService } from './entities/PageLikeEntityService.js';
import { SigninEntityService } from './entities/SigninEntityService.js';
import { UserEntityService } from './entities/UserEntityService.js';
import { UserListEntityService } from './entities/UserListEntityService.js';
import { FlashEntityService } from './entities/FlashEntityService.js';
import { FlashLikeEntityService } from './entities/FlashLikeEntityService.js';
import { RoleEntityService } from './entities/RoleEntityService.js';
import { ReversiGameEntityService } from './entities/ReversiGameEntityService.js';

import { ApAudienceService } from './activitypub/ApAudienceService.js';
import { ApDbResolverService } from './activitypub/ApDbResolverService.js';
import { ApDeliverManagerService } from './activitypub/ApDeliverManagerService.js';
import { ApInboxService } from './activitypub/ApInboxService.js';
import { ApLoggerService } from './activitypub/ApLoggerService.js';
import { ApMfmService } from './activitypub/ApMfmService.js';
import { ApRendererService } from './activitypub/ApRendererService.js';
import { ApRequestService } from './activitypub/ApRequestService.js';
import { ApResolverService } from './activitypub/ApResolverService.js';
import { LdSignatureService } from './activitypub/LdSignatureService.js';
import { RemoteLoggerService } from './RemoteLoggerService.js';
import { RemoteUserResolveService } from './RemoteUserResolveService.js';
import { WebfingerService } from './WebfingerService.js';
import { ApImageService } from './activitypub/models/ApImageService.js';
import { ApMentionService } from './activitypub/models/ApMentionService.js';
import { ApNoteService } from './activitypub/models/ApNoteService.js';
import { ApPersonService } from './activitypub/models/ApPersonService.js';
import { ApQuestionService } from './activitypub/models/ApQuestionService.js';
import { QueueModule } from './QueueModule.js';
import { QueueService } from './QueueService.js';
import { LoggerService } from './LoggerService.js';
import type { Provider } from '@nestjs/common';
import { ReactionDeleteService } from './ReactionDeleteService.js';
import { ReactionDecodeService } from './ReactionDecodeService.js';
import { LegacyReactionConvertService } from './LegacyReactionConvertService copy.js';

//#region 文字列ベースでのinjection用(循環参照対応のため)
const $AccountMoveService: Provider = { provide: 'AccountMoveService', useExisting: AccountMoveService };
const $AnnouncementService: Provider = { provide: 'AnnouncementService', useExisting: AnnouncementService };
const $AvatarDecorationService: Provider = { provide: 'AvatarDecorationService', useExisting: AvatarDecorationService };
const $CustomEmojiService: Provider = { provide: 'CustomEmojiService', useExisting: CustomEmojiService };
const $FederatedInstanceService: Provider = { provide: 'FederatedInstanceService', useExisting: FederatedInstanceService };
const $FetchInstanceMetadataService: Provider = { provide: 'FetchInstanceMetadataService', useExisting: FetchInstanceMetadataService };
const $GlobalEventService: Provider = { provide: 'GlobalEventService', useExisting: GlobalEventService };
const $HashtagService: Provider = { provide: 'HashtagService', useExisting: HashtagService };
const $IdService: Provider = { provide: 'IdService', useExisting: IdService };
const $MetaService: Provider = { provide: 'MetaService', useExisting: MetaService };
const $MfmService: Provider = { provide: 'MfmService', useExisting: MfmService };
const $NotificationService: Provider = { provide: 'NotificationService', useExisting: NotificationService };
const $RoleService: Provider = { provide: 'RoleService', useExisting: RoleService };
const $CacheService: Provider = { provide: 'CacheService', useExisting: CacheService };
const $UserFollowingService: Provider = { provide: 'UserFollowingService', useExisting: UserFollowingService };
const $UtilityService: Provider = { provide: 'UtilityService', useExisting: UtilityService };

const $UsersChart: Provider = { provide: 'UsersChart', useExisting: UsersChart };
const $InstanceChart: Provider = { provide: 'InstanceChart', useExisting: InstanceChart };

const $DriveFileEntityService: Provider = { provide: 'DriveFileEntityService', useExisting: DriveFileEntityService };
const $NoteEntityService: Provider = { provide: 'NoteEntityService', useExisting: NoteEntityService };
const $PageEntityService: Provider = { provide: 'PageEntityService', useExisting: PageEntityService };
const $UserEntityService: Provider = { provide: 'UserEntityService', useExisting: UserEntityService };
const $RoleEntityService: Provider = { provide: 'RoleEntityService', useExisting: RoleEntityService };

const $ApLoggerService: Provider = { provide: 'ApLoggerService', useExisting: ApLoggerService };
const $ApMfmService: Provider = { provide: 'ApMfmService', useExisting: ApMfmService };
const $ApResolverService: Provider = { provide: 'ApResolverService', useExisting: ApResolverService };
const $ApImageService: Provider = { provide: 'ApImageService', useExisting: ApImageService };
const $ApNoteService: Provider = { provide: 'ApNoteService', useExisting: ApNoteService };
const $ApPersonService: Provider = { provide: 'ApPersonService', useExisting: ApPersonService };
//#endregion

@Module({
	imports: [
		QueueModule,
	],
	providers: [
		LoggerService,
		AccountMoveService,
		AccountUpdateService,
		AiService,
		AnnouncementService,
		AntennaService,
		AppLockService,
		AchievementService,
		AvatarDecorationService,
		CaptchaService,
		CreateSystemUserService,
		CustomEmojiService,
		DeleteAccountService,
		DownloadService,
		DriveService,
		EmailService,
		FederatedInstanceService,
		FetchInstanceMetadataService,
		GlobalEventService,
		HashtagService,
		HttpRequestService,
		IdService,
		ImageProcessingService,
		InstanceActorService,
		InternalStorageService,
		MetaService,
		MfmService,
		ModerationLogService,
		NoteCreateService,
		NoteDeleteService,
		NotePiningService,
		NoteReadService,
		NotificationService,
		PollService,
		ProxyAccountService,
		PushNotificationService,
		QueryService,
		ReactionCreateService,
		ReactionDeleteService,
		ReactionDecodeService,
		LegacyReactionConvertService,
		RelayService,
		RoleService,
		S3Service,
		SignupService,
		WebAuthnService,
		UserBlockingBlockService,
		UserBlockingCheckService,
		UserBlockingUnblockService,
		CacheService,
		UserService,
		UserFollowingService,
		UserKeypairService,
		UserListService,
		UserMutingService,
		UserSuspendService,
		UserAuthService,
		VideoProcessingService,
		WebhookService,
		UtilityService,
		FileInfoService,
		SearchService,
		ClipService,
		FeaturedService,
		FanoutTimelineService,
		ChannelFollowingService,
		RegistryApiService,
		ReversiService,

		ChartLoggerService,
		FederationChart,
		NotesChart,
		UsersChart,
		ActiveUsersChart,
		InstanceChart,
		PerUserNotesChart,
		PerUserPvChart,
		DriveChart,
		PerUserReactionsChart,
		PerUserFollowingChart,
		PerUserDriveChart,
		ApRequestChart,
		ChartManagementService,

		AbuseUserReportEntityService,
		AntennaEntityService,
		AppEntityService,
		AuthSessionEntityService,
		BlockingEntityService,
		ChannelEntityService,
		ClipEntityService,
		DriveFileEntityService,
		DriveFolderEntityService,
		EmojiEntityService,
		FollowingEntityService,
		FollowRequestEntityService,
		GalleryLikeEntityService,
		GalleryPostEntityService,
		HashtagEntityService,
		InstanceEntityService,
		InviteCodeEntityService,
		ModerationLogEntityService,
		MutingEntityService,
		RenoteMutingEntityService,
		NoteEntityService,
		NoteFavoriteEntityService,
		NoteReactionEntityService,
		NotificationEntityService,
		PageEntityService,
		PageLikeEntityService,
		SigninEntityService,
		UserEntityService,
		UserListEntityService,
		FlashEntityService,
		FlashLikeEntityService,
		RoleEntityService,
		ReversiGameEntityService,

		ApAudienceService,
		ApDbResolverService,
		ApDeliverManagerService,
		ApInboxService,
		ApLoggerService,
		ApMfmService,
		ApRendererService,
		ApRequestService,
		ApResolverService,
		LdSignatureService,
		RemoteLoggerService,
		RemoteUserResolveService,
		WebfingerService,
		ApImageService,
		ApMentionService,
		ApNoteService,
		ApPersonService,
		ApQuestionService,
		QueueService,

		//#region 文字列ベースでのinjection用(循環参照対応のため)
		$AccountMoveService,
		$AnnouncementService,
		$AvatarDecorationService,
		$CustomEmojiService,
		$FederatedInstanceService,
		$FetchInstanceMetadataService,
		$GlobalEventService,
		$HashtagService,
		$IdService,
		$MetaService,
		$MfmService,
		$NotificationService,
		$RoleService,
		$CacheService,
		$UserFollowingService,
		$UtilityService,

		$UsersChart,
		$InstanceChart,

		$DriveFileEntityService,
		$NoteEntityService,
		$PageEntityService,
		$UserEntityService,
		$RoleEntityService,

		$ApLoggerService,
		$ApMfmService,
		$ApResolverService,
		$ApImageService,
		$ApNoteService,
		$ApPersonService,
		//#endregion
	],
	exports: [
		QueueModule,
		LoggerService,
		AccountMoveService,
		AccountUpdateService,
		AiService,
		AnnouncementService,
		AntennaService,
		AppLockService,
		AchievementService,
		AvatarDecorationService,
		CaptchaService,
		CreateSystemUserService,
		CustomEmojiService,
		DeleteAccountService,
		DownloadService,
		DriveService,
		EmailService,
		FederatedInstanceService,
		FetchInstanceMetadataService,
		GlobalEventService,
		HashtagService,
		HttpRequestService,
		IdService,
		ImageProcessingService,
		InstanceActorService,
		InternalStorageService,
		MetaService,
		MfmService,
		ModerationLogService,
		NoteCreateService,
		NoteDeleteService,
		NotePiningService,
		NoteReadService,
		NotificationService,
		PollService,
		ProxyAccountService,
		PushNotificationService,
		QueryService,
		ReactionCreateService,
		ReactionDeleteService,
		ReactionDecodeService,
		LegacyReactionConvertService,
		RelayService,
		RoleService,
		S3Service,
		SignupService,
		WebAuthnService,
		UserBlockingBlockService,
		UserBlockingCheckService,
		UserBlockingUnblockService,
		CacheService,
		UserService,
		UserFollowingService,
		UserKeypairService,
		UserListService,
		UserMutingService,
		UserSuspendService,
		UserAuthService,
		VideoProcessingService,
		WebhookService,
		UtilityService,
		FileInfoService,
		SearchService,
		ClipService,
		FeaturedService,
		FanoutTimelineService,
		ChannelFollowingService,
		RegistryApiService,
		ReversiService,

		FederationChart,
		NotesChart,
		UsersChart,
		ActiveUsersChart,
		InstanceChart,
		PerUserNotesChart,
		PerUserPvChart,
		DriveChart,
		PerUserReactionsChart,
		PerUserFollowingChart,
		PerUserDriveChart,
		ApRequestChart,
		ChartManagementService,

		AbuseUserReportEntityService,
		AntennaEntityService,
		AppEntityService,
		AuthSessionEntityService,
		BlockingEntityService,
		ChannelEntityService,
		ClipEntityService,
		DriveFileEntityService,
		DriveFolderEntityService,
		EmojiEntityService,
		FollowingEntityService,
		FollowRequestEntityService,
		GalleryLikeEntityService,
		GalleryPostEntityService,
		HashtagEntityService,
		InstanceEntityService,
		InviteCodeEntityService,
		ModerationLogEntityService,
		MutingEntityService,
		RenoteMutingEntityService,
		NoteEntityService,
		NoteFavoriteEntityService,
		NoteReactionEntityService,
		NotificationEntityService,
		PageEntityService,
		PageLikeEntityService,
		SigninEntityService,
		UserEntityService,
		UserListEntityService,
		FlashEntityService,
		FlashLikeEntityService,
		RoleEntityService,
		ReversiGameEntityService,

		ApAudienceService,
		ApDbResolverService,
		ApDeliverManagerService,
		ApInboxService,
		ApLoggerService,
		ApMfmService,
		ApRendererService,
		ApRequestService,
		ApResolverService,
		LdSignatureService,
		RemoteLoggerService,
		RemoteUserResolveService,
		WebfingerService,
		ApImageService,
		ApMentionService,
		ApNoteService,
		ApPersonService,
		ApQuestionService,
		QueueService,

		//#region 文字列ベースでのinjection用(循環参照対応のため)
		$AccountMoveService,
		$AnnouncementService,
		$AvatarDecorationService,
		$CustomEmojiService,
		$FederatedInstanceService,
		$FetchInstanceMetadataService,
		$GlobalEventService,
		$HashtagService,
		$IdService,
		$MetaService,
		$MfmService,
		$NotificationService,
		$RoleService,
		$CacheService,
		$UserFollowingService,
		$UtilityService,

		$UsersChart,
		$InstanceChart,

		$DriveFileEntityService,
		$NoteEntityService,
		$PageEntityService,
		$UserEntityService,
		$RoleEntityService,

		$ApLoggerService,
		$ApMfmService,
		$ApResolverService,
		$ApImageService,
		$ApNoteService,
		$ApPersonService,
		//#endregion
	],
})
export class CoreModule { }
