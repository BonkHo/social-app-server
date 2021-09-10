const { AuthenticationError, UserInputError } = require("apollo-server");

const Post = require("../../models/Post");
const checkAuth = require("../../utils/check-auth");

module.exports = {
	// These are the Query functions that can be used in order to retrieve information about a post.
	Query: {
		// Returns a list of all posts
		async getPosts() {
			try {
				const posts = await Post.find().sort({ createdAt: -1 });
				return posts;
			} catch (err) {
				throw new Error(err);
			}
		},

		// Returns a specific post given the postID
		async getPost(_, { postId }) {
			try {
				const post = await Post.findById(postId);
				if (post) {
					return post;
				} else {
					throw new Error("Post not found");
				}
			} catch (err) {
				throw new Error(err);
			}
		},
	},
	// These are the mutation functions that can be used for posts
	Mutation: {
		// This function allows users to create a post with authentication
		async createPost(_, { body }, context) {
			const user = checkAuth(context);

			if (body.trim() === "") {
				throw new Error("Post body must not be empty");
			}

			console.log(user);
			const newPost = new Post({
				body,
				user: user.id,
				username: user.username,
				createdAt: new Date().toISOString(),
			});

			const post = await newPost.save();

			context.pubsub.publish("NEW_POST", {
				newPost: post,
			});

			return post;
		},

		// This function allows a user to delete their own posts
		async deletePost(_, { postId }, context) {
			const user = checkAuth(context);
			console.log(user);
			try {
				const post = await Post.findById(postId);
				if (user.username === post.username) {
					await post.delete();
					return "Post successfully deleted.";
				} else {
					throw new AuthenticationError("Action not allowed.");
				}
			} catch (err) {
				throw new Error(err);
			}
		},
		// This function allows users to like or unlike a post
		async likePost(_, { postId }, context) {
			const { username } = checkAuth(context);

			const post = await Post.findById(postId);
			if (post) {
				if (post.likes.find((like) => like.username === username)) {
					// If post is already liked
					post.likes = post.likes.filter((like) => like.username !== username);
				} else {
					// If the post has not been liked
					post.likes.push({ username, createdAt: new Date().toISOString() });
				}

				await post.save();
				return post;
			} else {
				throw new UserInputError("Post not found.");
			}
		},
	},
	// Uses websockets to listen for incoming post events
	Subscription: {
		newPost: {
			subscribe: (_, __, { pubsub }) => pubsub.asynIterator("NEW_POST"),
		},
	},
};
