import { ok, route } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { discardImages, readImageUpload, replaceImage, type ImageFolder } from '@/lib/images';
import ChannelModel from '@/models/Channel';
import { requireManagedChannel } from './access';
import { toImage } from './serializers';

type Params = { handle: string };

/** `PUT` (multipart, image in `file`) and `DELETE` handlers for a channel's avatar or banner. */
export function channelImageRoutes(field: 'avatar' | 'banner', folder: ImageFolder) {
  return {
    PUT: route<Params>(async (request, { handle }) => {
      const channel = await requireManagedChannel(handle, await requireUser());
      const file = await readImageUpload(request);
      const image = await replaceImage({
        file,
        folder,
        previous: channel[field],
        persist: (stored) => ChannelModel.updateOne({ _id: channel._id }, { $set: { [field]: stored } }),
      });
      return ok({ [field]: toImage(image) });
    }),

    DELETE: route<Params>(async (_request, { handle }) => {
      const channel = await requireManagedChannel(handle, await requireUser());
      await ChannelModel.updateOne({ _id: channel._id }, { $set: { [field]: null } });
      await discardImages([channel[field]]);
      return ok({ [field]: null });
    }),
  };
}
