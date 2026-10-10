import { ok, route, unauthorized } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { discardImages, readImageUpload, replaceImage } from '@/lib/images';
import UserModel from '@/models/User';
import { toImage } from '@/server/serializers';

/** Upload a new avatar as multipart/form-data with the image in `file`. */
export const PUT = route(async (request) => {
  const sessionUser = await requireUser();
  const file = await readImageUpload(request);
  const user = await UserModel.findById(sessionUser.id).select('avatar').lean();
  if (!user) throw unauthorized();

  const avatar = await replaceImage({
    file,
    folder: 'avatars',
    previous: user.avatar,
    persist: (image) => UserModel.updateOne({ _id: user._id }, { $set: { avatar: image } }),
  });
  return ok({ avatar: toImage(avatar) });
});

export const DELETE = route(async () => {
  const sessionUser = await requireUser();
  const user = await UserModel.findByIdAndUpdate(sessionUser.id, { $set: { avatar: null } }).select('avatar').lean();
  if (!user) throw unauthorized();
  await discardImages([user.avatar]);
  return ok({ avatar: null });
});
